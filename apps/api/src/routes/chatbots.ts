import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { type AppType, requireAuth } from '../middleware/auth';
import { chatbotsService } from '../services/chatbots.service';

const chatbotsRoutes = new Hono<AppType>();

chatbotsRoutes.use('*', requireAuth);

const createChatbotSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  channelId: z.string().uuid().optional(),
  triggerType: z.enum(['keyword', 'always', 'schedule']).optional(),
  triggerConfig: z.record(z.unknown()).optional(),
});

const updateChatbotSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  channelId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
  triggerType: z.enum(['keyword', 'always', 'schedule']).optional(),
  triggerConfig: z.record(z.unknown()).optional(),
});

// List chatbots
chatbotsRoutes.get('/', async (c) => {
  const auth = c.get('auth');
  const result = await chatbotsService.findAll(auth.tenantId);
  return c.json(result);
});

// Get chatbot by ID
chatbotsRoutes.get('/:id', async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');

  const chatbot = await chatbotsService.findById(id, auth.tenantId);

  if (!chatbot) {
    throw new HTTPException(404, { message: 'Chatbot not found' });
  }

  return c.json(chatbot);
});

// Create chatbot
chatbotsRoutes.post('/', zValidator('json', createChatbotSchema), async (c) => {
  const auth = c.get('auth');
  const data = c.req.valid('json');

  const chatbot = await chatbotsService.create({
    tenantId: auth.tenantId,
    ...data,
  });

  return c.json({ chatbot }, 201);
});

// Update chatbot
chatbotsRoutes.patch('/:id', zValidator('json', updateChatbotSchema), async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');
  const data = c.req.valid('json');

  const existing = await chatbotsService.findById(id, auth.tenantId);
  if (!existing) {
    throw new HTTPException(404, { message: 'Chatbot not found' });
  }

  const chatbot = await chatbotsService.update(id, auth.tenantId, data);
  return c.json({ chatbot });
});

// Delete chatbot
chatbotsRoutes.delete('/:id', async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');

  const existing = await chatbotsService.findById(id, auth.tenantId);
  if (!existing) {
    throw new HTTPException(404, { message: 'Chatbot not found' });
  }

  await chatbotsService.delete(id, auth.tenantId);
  return c.json({ success: true });
});

// Toggle active status
chatbotsRoutes.post('/:id/toggle', async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');

  const existing = await chatbotsService.findById(id, auth.tenantId);
  if (!existing) {
    throw new HTTPException(404, { message: 'Chatbot not found' });
  }

  const chatbot = await chatbotsService.toggleActive(id, auth.tenantId, !existing.isActive);
  return c.json({ chatbot });
});

export { chatbotsRoutes };
