import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { type SendMessageJob, addSendMessageJob } from '../lib/queues';
import { type AppType, requireAuth } from '../middleware/auth';
import { channelsService } from '../services/channels.service';
import { conversationsService } from '../services/conversations.service';
import { messagesService } from '../services/messages.service';
import { socketEventsService } from '../services/socket-events.service';

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

  const channelType: SendMessageJob['channelType'] =
    channel.type === 'whatsapp' && channel.provider === 'evolution'
      ? 'whatsapp_unofficial'
      : channel.type === 'whatsapp'
        ? 'whatsapp_official'
        : (channel.type as SendMessageJob['channelType']);

  try {
    await addSendMessageJob({
      tenantId: auth.tenantId,
      conversationId: data.conversationId,
      channelId: channel.id,
      channelType,
      messageId: message.id,
      message: {
        type: data.type,
        content: data.content,
        mediaUrl: data.mediaUrl,
        mediaMimeType: data.mediaMimeType,
        templateId: data.templateId,
        templateParams: data.templateParams,
      },
      recipientPhone: conversation.contact?.phone || undefined,
      recipientExternalId: conversation.contact?.externalId || undefined,
      senderId: auth.userId,
    });
  } catch (error) {
    console.error('[Messages] Failed to enqueue send job', error);
  }

  const emit =
    socketEventsService.emitMessageUpdate ||
    socketEventsService.emitNewMessage?.bind(socketEventsService);
  if (emit) {
    await emit(data.conversationId, {
      ...message,
      status: 'pending',
    });
  }

  return c.json(message, 201);
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

// Upload and send media message
messagesRoutes.post('/upload', async (c) => {
  const auth = c.get('auth');
  const body = await c.req.parseBody();
  const file = body.file;
  const conversationId = body.conversationId as string;

  if (!file || !(file instanceof File)) {
    throw new HTTPException(400, { message: 'File is required' });
  }

  if (!conversationId) {
    throw new HTTPException(400, { message: 'conversationId is required' });
  }

  // Verify conversation belongs to tenant
  const conversation = await conversationsService.findById(conversationId, auth.tenantId);
  if (!conversation) {
    throw new HTTPException(404, { message: 'Conversation not found' });
  }

  // Get channel for sending
  const channel = await channelsService.findById(conversation.channelId, auth.tenantId);
  if (!channel) {
    throw new HTTPException(404, { message: 'Channel not found' });
  }

  // Determine media type
  const mediaType = file.type.startsWith('image/')
    ? 'image'
    : file.type.startsWith('video/')
      ? 'video'
      : file.type.startsWith('audio/')
        ? 'audio'
        : 'document';

  // Upload to Supabase Storage
  const { storageService } = await import('../services/storage.service');
  const buffer = Buffer.from(await file.arrayBuffer());

  const uploadResult = await storageService.uploadAttachment(
    auth.tenantId,
    conversationId,
    file.name,
    buffer,
    file.type,
  );

  if (!uploadResult.success) {
    throw new HTTPException(500, { message: uploadResult.error || 'Upload failed' });
  }

  // Create message in database
  const message = await messagesService.create({
    tenantId: auth.tenantId,
    conversationId,
    senderId: auth.userId,
    senderType: 'user',
    type: mediaType as 'image' | 'video' | 'audio' | 'document',
    content: file.name,
    mediaUrl: uploadResult.url,
    mediaType: file.type,
  });

  // Queue message for sending via channel
  const channelType: SendMessageJob['channelType'] =
    channel.type === 'whatsapp' && channel.provider === 'evolution'
      ? 'whatsapp_unofficial'
      : channel.type === 'whatsapp'
        ? 'whatsapp_official'
        : (channel.type as SendMessageJob['channelType']);

  try {
    await addSendMessageJob({
      tenantId: auth.tenantId,
      conversationId,
      channelId: channel.id,
      channelType,
      messageId: message.id,
      message: {
        type: mediaType as 'image' | 'video' | 'audio' | 'document',
        content: file.name,
        mediaUrl: uploadResult.url,
        mediaMimeType: file.type,
      },
      recipientPhone: conversation.contact?.phone || undefined,
      recipientExternalId: conversation.contact?.externalId || undefined,
      senderId: auth.userId,
    });
  } catch (error) {
    console.error('[Messages] Failed to enqueue media send job', error);
  }

  // Emit socket event
  const emit =
    socketEventsService.emitMessageUpdate ||
    socketEventsService.emitNewMessage?.bind(socketEventsService);
  if (emit) {
    await emit(conversationId, {
      ...message,
      status: 'pending',
    });
  }

  return c.json(
    {
      message,
      url: uploadResult.url,
      path: uploadResult.path,
      type: mediaType,
      size: file.size,
      mimeType: file.type,
      fileName: file.name,
    },
    201,
  );
});

export { messagesRoutes };
