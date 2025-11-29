import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { db, schema } from '../lib/db';
import { publishConversationUpdate, publishNewConversation, publishNewMessage } from '../lib/redis';
import { contactsService } from '../services/contacts.service';
import { conversationsService } from '../services/conversations.service';
import { messagesService } from '../services/messages.service';

const { channels } = schema;

const webhooksRoutes = new Hono();

// WhatsApp Official (360dialog) webhook
webhooksRoutes.post('/whatsapp/official', async (c) => {
  const payload = await c.req.json();

  console.log('WhatsApp Official webhook:', JSON.stringify(payload, null, 2));

  // TODO: Process WhatsApp message
  // 1. Validate signature
  // 2. Parse message/status update
  // 3. Find or create conversation
  // 4. Save message to database
  // 5. Emit socket event for real-time updates

  return c.json({ success: true });
});

// WhatsApp Official verification (GET)
webhooksRoutes.get('/whatsapp/official', async (c) => {
  const mode = c.req.query('hub.mode');
  const token = c.req.query('hub.verify_token');
  const challenge = c.req.query('hub.challenge');

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('WhatsApp webhook verified');
    return c.text(challenge || '');
  }

  return c.text('Forbidden', 403);
});

// WhatsApp Unofficial (Evolution API) webhook
webhooksRoutes.post('/whatsapp/evolution', async (c) => {
  try {
    const payload = await c.req.json();
    const event = payload.event;
    const instanceName = payload.instance;

    console.log(`Evolution API webhook [${event}]:`, JSON.stringify(payload, null, 2));

    // Find channel by instance name
    const channelResult = await db
      .select()
      .from(channels)
      .where(eq(channels.provider, 'evolution'))
      .limit(100);

    const channel = channelResult.find((ch) => {
      const config = ch.config as { instanceName?: string };
      return config?.instanceName === instanceName;
    });

    if (!channel) {
      console.log(`Channel not found for instance: ${instanceName}`);
      return c.json({ success: true, message: 'Channel not found' });
    }

    switch (event) {
      case 'messages.upsert': {
        // New message received
        const data = payload.data;
        if (!data || !data.key || !data.message) break;

        // Skip messages from the bot (fromMe = true)
        if (data.key.fromMe) {
          console.log('Skipping message from bot');
          break;
        }

        // Extract phone number from remoteJid
        const remoteJid = data.key.remoteJid;
        const phoneNumber = remoteJid?.replace('@s.whatsapp.net', '').replace('@g.us', '');

        if (!phoneNumber) break;

        // Find or create contact
        let contact = await contactsService.findByPhone(phoneNumber, channel.tenantId);

        if (!contact) {
          // Get contact name from push name or phone
          const pushName = data.pushName || phoneNumber;

          contact = await contactsService.create({
            tenantId: channel.tenantId,
            name: pushName,
            phone: phoneNumber,
            customFields: { source: 'whatsapp' },
          });
        }

        // Find or create conversation
        const { conversation, created } = await conversationsService.findOrCreate({
          tenantId: channel.tenantId,
          channelId: channel.id,
          contactId: contact.id,
        });

        // Extract message content
        let content = '';
        let type: 'text' | 'image' | 'video' | 'audio' | 'document' = 'text';
        let mediaUrl: string | undefined;

        if (data.message.conversation) {
          content = data.message.conversation;
        } else if (data.message.extendedTextMessage?.text) {
          content = data.message.extendedTextMessage.text;
        } else if (data.message.imageMessage) {
          type = 'image';
          content = data.message.imageMessage.caption || '';
          mediaUrl = data.message.imageMessage.url;
        } else if (data.message.videoMessage) {
          type = 'video';
          content = data.message.videoMessage.caption || '';
          mediaUrl = data.message.videoMessage.url;
        } else if (data.message.audioMessage) {
          type = 'audio';
          mediaUrl = data.message.audioMessage.url;
        } else if (data.message.documentMessage) {
          type = 'document';
          content = data.message.documentMessage.fileName || 'Document';
          mediaUrl = data.message.documentMessage.url;
        }

        // Save message to database
        const message = await messagesService.create({
          tenantId: channel.tenantId,
          conversationId: conversation.id,
          senderId: contact.id,
          senderType: 'contact',
          type,
          content,
          mediaUrl,
          externalId: data.key.id,
          metadata: {
            remoteJid,
            timestamp: data.messageTimestamp,
          },
        });

        console.log(`Message saved: ${message.id}`);

        // Publish real-time events via Redis
        const messageWithSender = {
          ...message,
          sender: {
            id: contact.id,
            name: contact.name,
            avatarUrl: contact.avatarUrl,
          },
        };

        // Publish new message event
        await publishNewMessage(channel.tenantId, conversation.id, messageWithSender);

        // Get full conversation data for update
        const fullConversation = await conversationsService.findById(conversation.id, channel.tenantId);

        if (created) {
          // New conversation
          await publishNewConversation(channel.tenantId, fullConversation);
        } else {
          // Update existing conversation (lastMessageAt changed)
          await publishConversationUpdate(channel.tenantId, fullConversation);
        }

        break;
      }

      case 'messages.update': {
        // Message status update (sent, delivered, read)
        const data = payload.data;
        if (!data || !Array.isArray(data)) break;

        for (const update of data) {
          const status = update.update?.status;
          const messageId = update.key?.id;

          if (!messageId || !status) continue;

          // Map Evolution API status to our status
          let mappedStatus: 'pending' | 'sent' | 'delivered' | 'read' | 'failed' = 'sent';
          switch (status) {
            case 'PENDING':
              mappedStatus = 'pending';
              break;
            case 'SERVER_ACK':
              mappedStatus = 'sent';
              break;
            case 'DELIVERY_ACK':
              mappedStatus = 'delivered';
              break;
            case 'READ':
              mappedStatus = 'read';
              break;
            case 'PLAYED':
              mappedStatus = 'read';
              break;
          }

          // Update message status by whatsapp message ID
          // await messagesService.updateByExternalId(messageId, { status: mappedStatus });
          console.log(`Message ${messageId} status updated to ${mappedStatus}`);
        }
        break;
      }

      case 'qrcode.updated': {
        // QR code for connection - could emit to frontend
        console.log('QR Code updated for instance:', instanceName);
        break;
      }

      case 'connection.update': {
        // Connection status changed
        const state = payload.data?.state;
        console.log(`Connection state for ${instanceName}: ${state}`);

        if (state === 'open') {
          // Mark channel as connected
          await db
            .update(channels)
            .set({ isActive: true, connectedAt: new Date() })
            .where(eq(channels.id, channel.id));
        } else if (state === 'close') {
          // Mark channel as disconnected
          await db
            .update(channels)
            .set({ isActive: false, connectedAt: null })
            .where(eq(channels.id, channel.id));
        }
        break;
      }
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('Evolution webhook error:', error);
    return c.json({ success: false, error: 'Internal error' }, 500);
  }
});

// Instagram webhook
webhooksRoutes.post('/instagram', async (c) => {
  const payload = await c.req.json();

  console.log('Instagram webhook:', JSON.stringify(payload, null, 2));

  // TODO: Process Instagram DM
  // 1. Validate signature
  // 2. Parse message
  // 3. Find or create conversation
  // 4. Save message
  // 5. Emit socket event

  return c.json({ success: true });
});

// Instagram verification (GET)
webhooksRoutes.get('/instagram', async (c) => {
  const mode = c.req.query('hub.mode');
  const token = c.req.query('hub.verify_token');
  const challenge = c.req.query('hub.challenge');

  const verifyToken = process.env.INSTAGRAM_VERIFY_TOKEN;

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('Instagram webhook verified');
    return c.text(challenge || '');
  }

  return c.text('Forbidden', 403);
});

// Messenger webhook
webhooksRoutes.post('/messenger', async (c) => {
  const payload = await c.req.json();

  console.log('Messenger webhook:', JSON.stringify(payload, null, 2));

  // TODO: Process Messenger message

  return c.json({ success: true });
});

// Messenger verification (GET)
webhooksRoutes.get('/messenger', async (c) => {
  const mode = c.req.query('hub.mode');
  const token = c.req.query('hub.verify_token');
  const challenge = c.req.query('hub.challenge');

  const verifyToken = process.env.MESSENGER_VERIFY_TOKEN;

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('Messenger webhook verified');
    return c.text(challenge || '');
  }

  return c.text('Forbidden', 403);
});

// Generic webhook for automations
webhooksRoutes.post('/automation/:automationId', async (c) => {
  const automationId = c.req.param('automationId');
  const payload = await c.req.json();

  console.log(`Automation ${automationId} webhook:`, payload);

  // TODO: Trigger automation flow

  return c.json({ success: true });
});

export { webhooksRoutes };
