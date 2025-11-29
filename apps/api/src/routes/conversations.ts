import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { HTTPException } from 'hono/http-exception';
import { requireAuth } from '../middleware/auth';
import { conversationsService } from '../services/conversations.service';

const conversationsRoutes = new Hono();

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

// List conversations
conversationsRoutes.get('/', async (c) => {
  const auth = c.get('auth');
  const {
    page = '1',
    limit = '20',
    status,
    inboxId,
    assigneeId,
    channelId,
  } = c.req.query();

  const result = await conversationsService.findAll({
    tenantId: auth.tenantId,
    status: status as 'pending' | 'open' | 'resolved' | 'snoozed' | undefined,
    inboxId,
    assigneeId,
    channelId,
    page: parseInt(page),
    limit: parseInt(limit),
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

// Update conversation status
conversationsRoutes.patch(
  '/:id/status',
  zValidator('json', updateStatusSchema),
  async (c) => {
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
  }
);

// Assign conversation
conversationsRoutes.patch(
  '/:id/assign',
  zValidator('json', assignSchema),
  async (c) => {
    const auth = c.get('auth');
    const id = c.req.param('id');
    const { userId } = c.req.valid('json');

    const conversation = await conversationsService.assign(
      id,
      auth.tenantId,
      userId
    );

    if (!conversation) {
      throw new HTTPException(404, { message: 'Conversation not found' });
    }

    return c.json(conversation);
  }
);

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
conversationsRoutes.post(
  '/:id/snooze',
  zValidator('json', snoozeSchema),
  async (c) => {
    const auth = c.get('auth');
    const id = c.req.param('id');
    const { until } = c.req.valid('json');

    const conversation = await conversationsService.snooze(
      id,
      auth.tenantId,
      new Date(until)
    );

    if (!conversation) {
      throw new HTTPException(404, { message: 'Conversation not found' });
    }

    return c.json(conversation);
  }
);

// Transfer to another inbox
conversationsRoutes.post(
  '/:id/transfer',
  zValidator('json', transferSchema),
  async (c) => {
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
  }
);

export { conversationsRoutes };
