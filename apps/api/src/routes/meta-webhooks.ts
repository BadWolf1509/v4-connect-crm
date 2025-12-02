import { and, db, eq } from '@v4-connect/database';
import { channels, contacts, conversations, messages } from '@v4-connect/database/schema';
import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { publishConversationUpdate, publishNewConversation, publishNewMessage } from '../lib/redis';
import { automationExecutorService } from '../services/automation-executor.service';
import { metaService } from '../services/meta.service';
import { notificationsService } from '../services/notifications.service';

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
      switch (msg.type) {
        case 'message':
          if (msg.message) {
            await processIncomingMessage(event.platform, msg);
          }
          break;

        case 'delivery':
          if (msg.delivery) {
            await processDeliveryStatus(msg.delivery.mids);
          }
          break;

        case 'read':
          if (msg.read) {
            await processReadReceipt(msg.recipientId, msg.read.watermark);
          }
          break;

        case 'reaction':
          if (msg.reaction) {
            await processReaction(event.platform, msg);
          }
          break;

        case 'postback':
          console.log(`[Meta Webhook] Postback received: ${msg.postback?.payload}`);
          break;
      }
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
    const messageId = nanoid();
    const isNewConversation = !conversation.lastMessageAt;

    await db.insert(messages).values({
      id: messageId,
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

    // Update conversation
    await db
      .update(conversations)
      .set({
        lastMessageAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(conversations.id, conversation.id));

    console.log(`[Meta] Message saved: ${messageType} in conversation ${conversation.id}`);

    // Emit real-time events via WebSocket
    const messageData = {
      id: messageId,
      conversationId: conversation.id,
      type: messageType,
      content,
      mediaUrl,
      senderType: 'contact',
      status: 'delivered',
      createdAt: new Date().toISOString(),
      contact: {
        id: contact.id,
        name: contact.name,
        avatarUrl: contact.avatarUrl,
      },
    };

    await publishNewMessage(channel.tenantId, conversation.id, messageData);

    // Get updated conversation data
    const updatedConversation = await db.query.conversations.findFirst({
      where: eq(conversations.id, conversation.id),
      with: {
        contact: true,
        channel: true,
      },
    });

    if (isNewConversation) {
      await publishNewConversation(channel.tenantId, updatedConversation);
    } else {
      await publishConversationUpdate(channel.tenantId, updatedConversation);
    }

    // Send push notification to assigned user
    if (conversation.assigneeId) {
      try {
        const truncatedContent = content.length > 100 ? `${content.substring(0, 97)}...` : content;
        await notificationsService.create({
          tenantId: channel.tenantId,
          userId: conversation.assigneeId,
          title: `Nova mensagem de ${contact.name}`,
          body:
            truncatedContent ||
            `${messageType === 'image' ? '📷 Imagem' : messageType === 'video' ? '🎥 Vídeo' : messageType === 'audio' ? '🎵 Áudio' : '📎 Arquivo'}`,
          link: `/inbox?conversation=${conversation.id}`,
          type: 'message',
        });
        console.log(`[Meta] Notification sent to user ${conversation.assigneeId}`);
      } catch (notifError) {
        console.error('[Meta] Failed to send notification:', notifError);
      }
    }

    // Trigger automations for message_received
    try {
      await automationExecutorService.processTrigger('message_received', {
        tenantId: channel.tenantId,
        conversationId: conversation.id,
        contactId: contact.id,
        channelId: channel.id,
        messageContent: content || undefined,
      });
    } catch (automationError) {
      console.error('[Meta] Automation trigger error:', automationError);
    }
  } catch (error) {
    console.error('[Meta] Error processing message:', error);
    throw error;
  }
}

/**
 * Process delivery status updates
 */
async function processDeliveryStatus(mids: string[]) {
  if (!mids || mids.length === 0) return;

  try {
    for (const mid of mids) {
      await db
        .update(messages)
        .set({ status: 'delivered', updatedAt: new Date() })
        .where(and(eq(messages.externalId, mid), eq(messages.status, 'sent')));
    }
    console.log(`[Meta] Marked ${mids.length} messages as delivered`);
  } catch (error) {
    console.error('[Meta] Error processing delivery status:', error);
  }
}

/**
 * Process read receipts
 */
async function processReadReceipt(recipientId: string, watermark: number) {
  try {
    // Find the contact by external ID
    const contact = await db.query.contacts.findFirst({
      where: eq(contacts.externalId, recipientId),
    });

    if (!contact) return;

    // Find conversations for this contact
    const contactConversations = await db.query.conversations.findMany({
      where: eq(conversations.contactId, contact.id),
    });

    if (contactConversations.length === 0) return;

    const conversationIds = contactConversations.map((c) => c.id);
    const watermarkDate = new Date(watermark);

    // Mark all outbound messages before watermark as read
    for (const convId of conversationIds) {
      await db
        .update(messages)
        .set({ status: 'read', updatedAt: new Date() })
        .where(
          and(
            eq(messages.conversationId, convId),
            eq(messages.direction, 'outbound'),
            eq(messages.status, 'delivered'),
          ),
        );
    }

    console.log(
      `[Meta] Processed read receipt for contact ${contact.id} (watermark: ${watermarkDate.toISOString()})`,
    );
  } catch (error) {
    console.error('[Meta] Error processing read receipt:', error);
  }
}

/**
 * Process reactions
 */
async function processReaction(
  platform: 'messenger' | 'instagram',
  event: {
    senderId: string;
    recipientId: string;
    reaction?: {
      mid: string;
      action: 'react' | 'unreact';
      emoji?: string;
      reaction?: string;
    };
  },
) {
  if (!event.reaction) return;

  try {
    const { mid, action, emoji, reaction } = event.reaction;
    const reactionEmoji = emoji || reaction || '';

    // Find the message by external ID
    const message = await db.query.messages.findFirst({
      where: eq(messages.externalId, mid),
    });

    if (!message) {
      console.warn(`[Meta] Message not found for reaction: ${mid}`);
      return;
    }

    // Get existing metadata
    const metadata = (message.metadata as Record<string, unknown>) || {};
    const reactions = (metadata.reactions as Array<{ emoji: string; senderId: string }>) || [];

    if (action === 'react') {
      // Add reaction (remove any existing reaction from same sender first)
      const filtered = reactions.filter((r) => r.senderId !== event.senderId);
      filtered.push({ emoji: reactionEmoji, senderId: event.senderId });
      metadata.reactions = filtered;
    } else {
      // Remove reaction
      metadata.reactions = reactions.filter((r) => r.senderId !== event.senderId);
    }

    // Update message metadata
    await db
      .update(messages)
      .set({ metadata, updatedAt: new Date() })
      .where(eq(messages.id, message.id));

    console.log(
      `[Meta] ${action === 'react' ? 'Added' : 'Removed'} reaction ${reactionEmoji} on message ${message.id} (${platform})`,
    );

    // Publish update via WebSocket
    await publishNewMessage(message.tenantId, message.conversationId, {
      id: message.id,
      type: 'reaction_update',
      metadata,
    });
  } catch (error) {
    console.error('[Meta] Error processing reaction:', error);
  }
}

export { metaWebhooksRoutes };
