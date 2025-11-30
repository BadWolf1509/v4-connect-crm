import { and, db, eq } from '@v4-connect/database';
import { channels, contacts, conversations, messages } from '@v4-connect/database/schema';
import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { metaService } from '../services/meta.service';

const metaWebhooksRoutes = new Hono();

interface ChannelConfig {
  pageId?: string;
  igUserId?: string;
  [key: string]: unknown;
}

/**
 * GET /meta/webhook - Webhook verification
 */
metaWebhooksRoutes.get('/webhook', (c) => {
  const mode = c.req.query('hub.mode');
  const token = c.req.query('hub.verify_token');
  const challenge = c.req.query('hub.challenge');

  if (!mode || !token || !challenge) {
    return c.text('Missing parameters', 400);
  }

  const result = metaService.verifyWebhook(mode, token, challenge);

  if (result) {
    return c.text(result, 200);
  }

  return c.text('Verification failed', 403);
});

/**
 * POST /meta/webhook - Receive webhook events
 */
metaWebhooksRoutes.post('/webhook', async (c) => {
  try {
    const body = await c.req.json();
    const event = metaService.parseWebhookEvent(body);

    if (!event) {
      console.warn('[Meta Webhook] Failed to parse event');
      return c.text('OK', 200);
    }

    console.log(`[Meta Webhook] Received ${event.events.length} ${event.platform} events`);

    // Process each event
    for (const msg of event.events) {
      if (msg.type !== 'message' || !msg.message) {
        continue;
      }

      await processIncomingMessage(event.platform, msg);
    }

    return c.text('OK', 200);
  } catch (error) {
    console.error('[Meta Webhook] Error:', error);
    // Always return 200 to Meta to prevent retries
    return c.text('OK', 200);
  }
});

/**
 * Process incoming message from Meta
 */
async function processIncomingMessage(
  platform: 'messenger' | 'instagram',
  event: {
    senderId: string;
    recipientId: string;
    timestamp: number;
    message?: {
      mid: string;
      text?: string;
      attachments?: Array<{
        type: string;
        payload: { url: string };
      }>;
    };
  },
) {
  try {
    const channelType = platform === 'instagram' ? 'instagram' : 'messenger';

    // Find the channel by looking in config for pageId or igUserId
    const allChannels = await db.query.channels.findMany({
      where: eq(channels.type, channelType),
    });

    const channel = allChannels.find((c) => {
      const config = c.config as ChannelConfig;
      return config?.pageId === event.recipientId || config?.igUserId === event.recipientId;
    });

    if (!channel) {
      console.warn(`[Meta] Channel not found for ${channelType}:${event.recipientId}`);
      return;
    }

    // Find or create contact
    let contact = await db.query.contacts.findFirst({
      where: and(eq(contacts.tenantId, channel.tenantId), eq(contacts.externalId, event.senderId)),
    });

    if (!contact) {
      // Create new contact - use customFields instead of metadata
      const [newContact] = await db
        .insert(contacts)
        .values({
          id: nanoid(),
          tenantId: channel.tenantId,
          name: `${platform === 'instagram' ? 'IG' : 'FB'} User ${event.senderId.slice(-6)}`,
          externalId: event.senderId,
          customFields: { platform, platformId: event.senderId },
        })
        .returning();

      contact = newContact;
    }

    if (!contact) {
      console.error('[Meta] Failed to find or create contact');
      return;
    }

    // Find or create conversation
    let conversation = await db.query.conversations.findFirst({
      where: and(eq(conversations.channelId, channel.id), eq(conversations.contactId, contact.id)),
    });

    if (!conversation) {
      const [newConversation] = await db
        .insert(conversations)
        .values({
          id: nanoid(),
          tenantId: channel.tenantId,
          channelId: channel.id,
          contactId: contact.id,
          status: 'open',
        })
        .returning();

      conversation = newConversation;
    } else if (conversation.status === 'resolved') {
      // Reopen conversation (not 'closed' as that doesn't exist in the enum)
      await db
        .update(conversations)
        .set({ status: 'open', updatedAt: new Date() })
        .where(eq(conversations.id, conversation.id));
    }

    if (!conversation) {
      console.error('[Meta] Failed to find or create conversation');
      return;
    }

    // Determine message type and content
    let messageType: 'text' | 'image' | 'video' | 'audio' | 'document' = 'text';
    const content = event.message?.text || '';
    let mediaUrl: string | null = null;

    if (event.message?.attachments && event.message.attachments.length > 0) {
      const attachment = event.message.attachments[0];
      mediaUrl = attachment.payload.url;

      switch (attachment.type) {
        case 'image':
          messageType = 'image';
          break;
        case 'video':
          messageType = 'video';
          break;
        case 'audio':
          messageType = 'audio';
          break;
        default:
          messageType = 'document';
      }
    }

    // Create message - use senderType and direction instead of sender
    await db.insert(messages).values({
      id: nanoid(),
      tenantId: channel.tenantId,
      conversationId: conversation.id,
      type: messageType,
      content,
      mediaUrl,
      senderType: 'contact',
      direction: 'inbound',
      status: 'delivered',
      externalId: event.message?.mid,
      metadata: { platform, timestamp: event.timestamp },
    });

    // Update conversation - remove non-existent fields
    await db
      .update(conversations)
      .set({
        lastMessageAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(conversations.id, conversation.id));

    console.log(`[Meta] Message saved: ${messageType} in conversation ${conversation.id}`);

    // TODO: Emit real-time event via WebSocket
    // TODO: Send push notification to assigned user
  } catch (error) {
    console.error('[Meta] Error processing message:', error);
    throw error;
  }
}

export { metaWebhooksRoutes };
