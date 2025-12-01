import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { type AppType, requireAuth } from '../middleware/auth';
import { notificationsService } from '../services/notifications.service';

const notificationsRoutes = new Hono<AppType>();

const markReadSchema = z.object({
  id: z.string().uuid(),
});

notificationsRoutes.use('*', requireAuth);

// List notifications
notificationsRoutes.get('/', async (c) => {
  const auth = c.get('auth');
  const items = await notificationsService.listByUser(auth.userId, auth.tenantId);
  return c.json({ notifications: items });
});

// Mark notification as read
notificationsRoutes.post('/read', zValidator('json', markReadSchema), async (c) => {
  const auth = c.get('auth');
  const { id } = c.req.valid('json');

  await notificationsService.markAsRead(id, auth.userId);
  return c.json({ success: true });
});

// Mark all as read
notificationsRoutes.post('/read-all', async (c) => {
  const auth = c.get('auth');
  await notificationsService.markAllAsRead(auth.userId);
  return c.json({ success: true });
});

// Create notification (internal use)
notificationsRoutes.post('/', async (c) => {
  const auth = c.get('auth');
  const body = await c.req.json();

  if (!body.title || !body.userId) {
    throw new HTTPException(400, { message: 'title and userId are required' });
  }

  const created = await notificationsService.create({
    title: body.title,
    body: body.body,
    link: body.link,
    tenantId: auth.tenantId,
    userId: body.userId,
    type: body.type || 'message',
  });

  return c.json(created, 201);
});

export { notificationsRoutes };
