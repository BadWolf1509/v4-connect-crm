import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { type AppType, requireAuth } from '../middleware/auth';
import { conversationsService } from '../services/conversations.service';
import { messagesService } from '../services/messages.service';

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

  // Verify conversation belongs to tenant
  const conversation = await conversationsService.findById(data.conversationId, auth.tenantId);

  if (!conversation) {
    throw new HTTPException(404, { message: 'Conversation not found' });
  }

  // Create message in database
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

  // TODO: Send via channel provider (WhatsApp API, etc.)
  // This will be handled by a separate channel service
  // After sending, update status to 'sent'

  // Update conversation lastMessageAt
  await conversationsService.update(data.conversationId, auth.tenantId, {});

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
