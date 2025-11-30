import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { type AppType, requireAuth } from '../middleware/auth';
import { channelsService } from '../services/channels.service';
import { conversationsService } from '../services/conversations.service';
import { evolutionService } from '../services/evolution.service';
import { messagesService } from '../services/messages.service';
import { metaService } from '../services/meta.service';
import { socketEventsService } from '../services/socket-events.service';

// Types for API responses
interface EvolutionMessageResult {
  success: boolean;
  data?: {
    key?: {
      id: string;
      remoteJid: string;
      fromMe: boolean;
    };
  };
  error?: string;
}

interface MetaMessageResult {
  success: boolean;
  data?: {
    recipient_id: string;
    message_id: string;
  };
  error?: {
    message: string;
    type: string;
    code: number;
  };
}

const messagesRoutes = new Hono<AppType>();

messagesRoutes.use('*', requireAuth);

const sendMessageSchema = z.object({
  conversationId: z.string().uuid(),
  type: z.enum(['text', 'image', 'video', 'audio', 'document', 'location', 'template']),
  content: z.string().optional(),
  mediaUrl: z.string().url().optional(),
  mediaMimeType: z.string().optional(),
  templateId: z.string().optional(),
  templateParams: z.record(z.string()).optional(),
});

// Get messages for a conversation
messagesRoutes.get('/conversation/:conversationId', async (c) => {
  const auth = c.get('auth');
  const conversationId = c.req.param('conversationId');
  const { cursor, limit = '50' } = c.req.query();

  // Verify conversation belongs to tenant
  const conversation = await conversationsService.findById(conversationId, auth.tenantId);

  if (!conversation) {
    throw new HTTPException(404, { message: 'Conversation not found' });
  }

  const result = await messagesService.findByConversation({
    conversationId,
    tenantId: auth.tenantId,
    cursor,
    limit: Number.parseInt(limit),
  });

  return c.json(result);
});

// Send message
messagesRoutes.post('/', zValidator('json', sendMessageSchema), async (c) => {
  const auth = c.get('auth');
  const data = c.req.valid('json');

  // Verify conversation belongs to tenant and get full details
  const conversation = await conversationsService.findById(data.conversationId, auth.tenantId);

  if (!conversation) {
    throw new HTTPException(404, { message: 'Conversation not found' });
  }

  // Get channel details for sending
  const channel = await channelsService.findById(conversation.channelId, auth.tenantId);

  if (!channel) {
    throw new HTTPException(404, { message: 'Channel not found' });
  }

  // Create message in database with pending status
  const message = await messagesService.create({
    tenantId: auth.tenantId,
    conversationId: data.conversationId,
    senderId: auth.userId,
    senderType: 'user',
    type: data.type,
    content: data.content,
    mediaUrl: data.mediaUrl,
    mediaType: data.mediaMimeType,
  });

  let messageStatus: 'sent' | 'failed' = 'sent';
  let externalId: string | undefined;

  // Send via channel provider based on channel type and provider
  if (channel.type === 'whatsapp' && channel.provider === 'evolution') {
    const config = channel.config as { instanceName?: string };
    const instanceName = config?.instanceName;
    const contactPhone = conversation.contact?.phone;

    if (instanceName && contactPhone) {
      try {
        let result: EvolutionMessageResult | undefined;

        if (data.type === 'text' && data.content) {
          // Send text message
          result = await evolutionService.sendText(instanceName, {
            number: contactPhone,
            text: data.content,
          });
        } else if (data.type === 'image' && data.mediaUrl) {
          // Send image message
          result = await evolutionService.sendImage(instanceName, {
            number: contactPhone,
            image: data.mediaUrl,
            caption: data.content,
          });
        } else if (data.type === 'audio' && data.mediaUrl) {
          // Send audio message
          result = await evolutionService.sendAudio(instanceName, {
            number: contactPhone,
            audio: data.mediaUrl,
          });
        } else if (data.type === 'document' && data.mediaUrl) {
          // Send document message
          result = await evolutionService.sendDocument(instanceName, {
            number: contactPhone,
            document: data.mediaUrl,
            fileName: data.content || 'document',
            mimetype: data.mediaMimeType || 'application/octet-stream',
          });
        } else if (data.type === 'video' && data.mediaUrl) {
          // Send video message
          result = await evolutionService.sendMedia(instanceName, {
            number: contactPhone,
            mediatype: 'video',
            mimetype: data.mediaMimeType || 'video/mp4',
            media: data.mediaUrl,
            caption: data.content,
          });
        }

        if (result?.success && result.data) {
          externalId = result.data.key?.id;
          messageStatus = 'sent';
          console.log(`Message sent via Evolution API: ${externalId}`);
        } else {
          messageStatus = 'failed';
          console.error('Evolution API send failed:', result?.error);
        }
      } catch (error) {
        messageStatus = 'failed';
        console.error('Error sending via Evolution API:', error);
      }
    } else {
      console.warn('Missing instanceName or contactPhone for WhatsApp message');
      messageStatus = 'failed';
    }
  } else if (channel.type === 'instagram' || channel.type === 'messenger') {
    // Instagram Direct or Facebook Messenger via Meta Graph API
    const config = channel.config as { pageAccessToken?: string; igUserId?: string };
    const pageAccessToken = config?.pageAccessToken;
    const recipientId = conversation.contact?.externalId;

    if (pageAccessToken && recipientId) {
      try {
        let result: MetaMessageResult | undefined;

        if (channel.type === 'instagram') {
          // Instagram Direct
          const igUserId = config?.igUserId;
          if (!igUserId) {
            console.warn('Missing igUserId for Instagram channel');
            messageStatus = 'failed';
          } else if (data.type === 'text' && data.content) {
            result = await metaService.sendInstagramText(
              igUserId,
              pageAccessToken,
              recipientId,
              data.content,
            );
          } else if (data.type === 'image' && data.mediaUrl) {
            result = await metaService.sendInstagramMedia(
              igUserId,
              pageAccessToken,
              recipientId,
              'image',
              data.mediaUrl,
            );
          } else if (data.type === 'video' && data.mediaUrl) {
            result = await metaService.sendInstagramMedia(
              igUserId,
              pageAccessToken,
              recipientId,
              'video',
              data.mediaUrl,
            );
          } else if (data.type === 'audio' && data.mediaUrl) {
            result = await metaService.sendInstagramMedia(
              igUserId,
              pageAccessToken,
              recipientId,
              'audio',
              data.mediaUrl,
            );
          }
        } else {
          // Facebook Messenger
          if (data.type === 'text' && data.content) {
            result = await metaService.sendMessengerText(
              pageAccessToken,
              recipientId,
              data.content,
            );
          } else if (data.type === 'image' && data.mediaUrl) {
            result = await metaService.sendMessengerMedia(
              pageAccessToken,
              recipientId,
              'image',
              data.mediaUrl,
            );
          } else if (data.type === 'video' && data.mediaUrl) {
            result = await metaService.sendMessengerMedia(
              pageAccessToken,
              recipientId,
              'video',
              data.mediaUrl,
            );
          } else if (data.type === 'audio' && data.mediaUrl) {
            result = await metaService.sendMessengerMedia(
              pageAccessToken,
              recipientId,
              'audio',
              data.mediaUrl,
            );
          } else if (data.type === 'document' && data.mediaUrl) {
            result = await metaService.sendMessengerMedia(
              pageAccessToken,
              recipientId,
              'file',
              data.mediaUrl,
            );
          }
        }

        if (result?.success && result.data) {
          externalId = result.data.message_id;
          messageStatus = 'sent';
          console.log(`Message sent via Meta API: ${externalId}`);
        } else {
          messageStatus = 'failed';
          console.error('Meta API send failed:', result?.error);
        }
      } catch (error) {
        messageStatus = 'failed';
        console.error('Error sending via Meta API:', error);
      }
    } else {
      console.warn('Missing pageAccessToken or recipientId for Meta message');
      messageStatus = 'failed';
    }
  }

  // Update message status and external ID
  const currentMetadata =
    typeof message.metadata === 'object' && message.metadata ? message.metadata : {};
  const updatedMessage = await messagesService.update(message.id, auth.tenantId, {
    status: messageStatus,
    metadata: externalId
      ? { ...(currentMetadata as Record<string, unknown>), externalId }
      : (currentMetadata as Record<string, unknown>),
  });

  // Update conversation lastMessageAt
  await conversationsService.update(data.conversationId, auth.tenantId, {});

  // Emit socket event for real-time updates
  await socketEventsService.emitNewMessage(data.conversationId, {
    id: message.id,
    conversationId: message.conversationId,
    content: message.content,
    type: message.type,
    senderType: message.senderType,
    senderId: message.senderId,
    createdAt: message.createdAt,
    status: messageStatus,
    mediaUrl: message.mediaUrl,
  });

  return c.json(updatedMessage || message, 201);
});

// Get message by ID
messagesRoutes.get('/:id', async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');

  const message = await messagesService.findById(id, auth.tenantId);

  if (!message) {
    throw new HTTPException(404, { message: 'Message not found' });
  }

  return c.json(message);
});

// Delete message (soft delete)
messagesRoutes.delete('/:id', async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');

  const message = await messagesService.delete(id, auth.tenantId);

  if (!message) {
    throw new HTTPException(404, { message: 'Message not found' });
  }

  return c.json({ message: 'Message deleted' });
});

// Mark conversation as read
messagesRoutes.post('/conversation/:conversationId/read', async (c) => {
  const auth = c.get('auth');
  const conversationId = c.req.param('conversationId');

  // Verify conversation belongs to tenant
  const conversation = await conversationsService.findById(conversationId, auth.tenantId);

  if (!conversation) {
    throw new HTTPException(404, { message: 'Conversation not found' });
  }

  await messagesService.markAsRead(conversationId, auth.tenantId);

  return c.json({ message: 'Messages marked as read' });
});

// Get unread count for conversation
messagesRoutes.get('/conversation/:conversationId/unread', async (c) => {
  const auth = c.get('auth');
  const conversationId = c.req.param('conversationId');

  // Verify conversation belongs to tenant
  const conversation = await conversationsService.findById(conversationId, auth.tenantId);

  if (!conversation) {
    throw new HTTPException(404, { message: 'Conversation not found' });
  }

  const count = await messagesService.getUnreadCount(conversationId, auth.tenantId);

  return c.json({ unreadCount: count });
});

// Upload media
messagesRoutes.post('/upload', async (c) => {
  const body = await c.req.parseBody();
  const file = body.file;

  if (!file || !(file instanceof File)) {
    throw new HTTPException(400, { message: 'File is required' });
  }

  // TODO: Upload file to storage (S3, Supabase Storage, etc.)
  // For now, return a placeholder response

  return c.json({
    url: `https://storage.example.com/${crypto.randomUUID()}`,
    type: file.type.startsWith('image/')
      ? 'image'
      : file.type.startsWith('video/')
        ? 'video'
        : file.type.startsWith('audio/')
          ? 'audio'
          : 'document',
    size: file.size,
    mimeType: file.type,
    fileName: file.name,
  });
});

export { messagesRoutes };
