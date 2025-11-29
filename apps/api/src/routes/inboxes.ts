import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { type AppType, requireAuth } from '../middleware/auth';
import { channelsService } from '../services/channels.service';
import { inboxesService } from '../services/inboxes.service';

const inboxesRoutes = new Hono<AppType>();

inboxesRoutes.use('*', requireAuth);

const createInboxSchema = z.object({
  channelId: z.string().uuid(),
  name: z.string().min(2),
  isDefault: z.boolean().optional(),
});

const updateInboxSchema = z.object({
  name: z.string().min(2).optional(),
  isDefault: z.boolean().optional(),
});

// List inboxes
inboxesRoutes.get('/', async (c) => {
  const auth = c.get('auth');
  const { channelId } = c.req.query();

  const result = await inboxesService.findAll({
    tenantId: auth.tenantId,
    channelId,
  });

  return c.json(result);
});

// Get inbox by ID
inboxesRoutes.get('/:id', async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');

  const inbox = await inboxesService.findById(id, auth.tenantId);

  if (!inbox) {
    throw new HTTPException(404, { message: 'Inbox not found' });
  }

  return c.json(inbox);
});

// Create inbox
inboxesRoutes.post('/', zValidator('json', createInboxSchema), async (c) => {
  const auth = c.get('auth');
  const data = c.req.valid('json');

  // Verify channel exists and belongs to tenant
  const channel = await channelsService.findById(data.channelId, auth.tenantId);

  if (!channel) {
    throw new HTTPException(404, { message: 'Channel not found' });
  }

  const inbox = await inboxesService.create({
    tenantId: auth.tenantId,
    channelId: data.channelId,
    name: data.name,
    isDefault: data.isDefault,
  });

  return c.json(inbox, 201);
});

// Update inbox
inboxesRoutes.patch('/:id', zValidator('json', updateInboxSchema), async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');
  const data = c.req.valid('json');

  const inbox = await inboxesService.update(id, auth.tenantId, data);

  if (!inbox) {
    throw new HTTPException(404, { message: 'Inbox not found' });
  }

  return c.json(inbox);
});

// Delete inbox
inboxesRoutes.delete('/:id', async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');

  const inbox = await inboxesService.delete(id, auth.tenantId);

  if (!inbox) {
    throw new HTTPException(404, { message: 'Inbox not found' });
  }

  return c.json({ message: 'Inbox deleted' });
});

// Set as default
inboxesRoutes.post('/:id/default', async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');

  const inbox = await inboxesService.update(id, auth.tenantId, {
    isDefault: true,
  });

  if (!inbox) {
    throw new HTTPException(404, { message: 'Inbox not found' });
  }

  return c.json(inbox);
});

export { inboxesRoutes };
