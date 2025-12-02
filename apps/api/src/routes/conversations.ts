import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { type AppType, requireAuth } from '../middleware/auth';
import { channelsService } from '../services/channels.service';
import { conversationsService } from '../services/conversations.service';
import { metaService } from '../services/meta.service';

const conversationsRoutes = new Hono<AppType>();

conversationsRoutes.use('*', requireAuth);

const updateStatusSchema = z.object({
  status: z.enum(['pending', 'open', 'resolved', 'snoozed']),
});

const assignSchema = z.object({
  userId: z.string().uuid(),
});

const snoozeSchema = z.object({
  until: z.string().datetime(),
});

const transferSchema = z.object({
  inboxId: z.string().uuid(),
});

const createConversationSchema = z.object({
  contactId: z.string().uuid(),
  channelId: z.string().uuid(),
  inboxId: z.string().uuid().optional(),
});

const updateConversationSchema = z.object({
  status: z.enum(['pending', 'open', 'resolved', 'snoozed']).optional(),
  assigneeId: z.string().uuid().nullable().optional(),
});

// Create new conversation
conversationsRoutes.post('/', zValidator('json', createConversationSchema), async (c) => {
  const auth = c.get('auth');
  const data = c.req.valid('json');

  const { conversation, created } = await conversationsService.findOrCreate({
    tenantId: auth.tenantId,
    contactId: data.contactId,
    channelId: data.channelId,
    inboxId: data.inboxId,
    assigneeId: auth.userId,
    status: 'open',
  });

  // Get full conversation with contact and channel details
  const fullConversation = await conversationsService.findById(conversation.id, auth.tenantId);

  return c.json({ conversation: fullConversation, created }, created ? 201 : 200);
});

// List conversations
conversationsRoutes.get('/', async (c) => {
  const auth = c.get('auth');
  const { page = '1', limit = '20', status, inboxId, assigneeId, channelId } = c.req.query();

  const result = await conversationsService.findAll({
    tenantId: auth.tenantId,
    status: status as 'pending' | 'open' | 'resolved' | 'snoozed' | undefined,
    inboxId,
    assigneeId,
    channelId,
    page: Number.parseInt(page),
    limit: Number.parseInt(limit),
  });

  return c.json(result);
});

// Get conversation by ID
conversationsRoutes.get('/:id', async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');

  const conversation = await conversationsService.findById(id, auth.tenantId);

  if (!conversation) {
    throw new HTTPException(404, { message: 'Conversation not found' });
  }

  return c.json(conversation);
});

// Update conversation (generic)
conversationsRoutes.patch('/:id', zValidator('json', updateConversationSchema), async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');
  const data = c.req.valid('json');

  const conversation = await conversationsService.update(id, auth.tenantId, data);

  if (!conversation) {
    throw new HTTPException(404, { message: 'Conversation not found' });
  }

  return c.json(conversation);
});

// Update conversation status
conversationsRoutes.patch('/:id/status', zValidator('json', updateStatusSchema), async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');
  const { status } = c.req.valid('json');

  const conversation = await conversationsService.update(id, auth.tenantId, {
    status,
  });

  if (!conversation) {
    throw new HTTPException(404, { message: 'Conversation not found' });
  }

  return c.json(conversation);
});

// Assign conversation
conversationsRoutes.patch('/:id/assign', zValidator('json', assignSchema), async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');
  const { userId } = c.req.valid('json');

  const conversation = await conversationsService.assign(id, auth.tenantId, userId);

  if (!conversation) {
    throw new HTTPException(404, { message: 'Conversation not found' });
  }

  return c.json(conversation);
});

// Unassign conversation
conversationsRoutes.post('/:id/unassign', async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');

  const conversation = await conversationsService.unassign(id, auth.tenantId);

  if (!conversation) {
    throw new HTTPException(404, { message: 'Conversation not found' });
  }

  return c.json(conversation);
});

// Resolve conversation
conversationsRoutes.post('/:id/resolve', async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');

  const conversation = await conversationsService.resolve(id, auth.tenantId);

  if (!conversation) {
    throw new HTTPException(404, { message: 'Conversation not found' });
  }

  return c.json(conversation);
});

// Reopen conversation
conversationsRoutes.post('/:id/reopen', async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');

  const conversation = await conversationsService.reopen(id, auth.tenantId);

  if (!conversation) {
    throw new HTTPException(404, { message: 'Conversation not found' });
  }

  return c.json(conversation);
});

// Snooze conversation
conversationsRoutes.post('/:id/snooze', zValidator('json', snoozeSchema), async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');
  const { until } = c.req.valid('json');

  const conversation = await conversationsService.snooze(id, auth.tenantId, new Date(until));

  if (!conversation) {
    throw new HTTPException(404, { message: 'Conversation not found' });
  }

  return c.json(conversation);
});

// Transfer to another inbox
conversationsRoutes.post('/:id/transfer', zValidator('json', transferSchema), async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');
  const { inboxId } = c.req.valid('json');

  const conversation = await conversationsService.update(id, auth.tenantId, {
    inboxId,
  });

  if (!conversation) {
    throw new HTTPException(404, { message: 'Conversation not found' });
  }

  return c.json(conversation);
});

// Send typing indicator
conversationsRoutes.post('/:id/typing', async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');

  const conversation = await conversationsService.findById(id, auth.tenantId);

  if (!conversation) {
    throw new HTTPException(404, { message: 'Conversation not found' });
  }

  // Get channel config
  const channel = await channelsService.findById(conversation.channelId, auth.tenantId);

  if (!channel) {
    throw new HTTPException(404, { message: 'Channel not found' });
  }

  const config = channel.config as Record<string, string>;
  const contact = conversation.contact;

  if (!contact?.externalId) {
    return c.json({ success: false, error: 'Contact has no external ID' }, 400);
  }

  try {
    // Send typing indicator based on channel type
    if (channel.type === 'instagram') {
      const igUserId = config.igUserId || config.pageId;
      if (igUserId && config.pageAccessToken) {
        await metaService.sendInstagramTypingOn(
          igUserId,
          config.pageAccessToken,
          contact.externalId,
        );
      }
    } else if (channel.type === 'messenger') {
      if (config.pageAccessToken) {
        await metaService.sendMessengerTypingOn(config.pageAccessToken, contact.externalId);
      }
    }
    // Note: WhatsApp (Evolution) doesn't support typing indicators via API

    return c.json({ success: true });
  } catch (error) {
    console.error('[Typing] Error sending typing indicator:', error);
    return c.json({ success: false, error: 'Failed to send typing indicator' }, 500);
  }
});

export { conversationsRoutes };
