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

// ============ Flow Nodes ============

const createNodeSchema = z.object({
  type: z.enum(['start', 'message', 'condition', 'action', 'delay', 'end']),
  name: z.string().optional(),
  config: z.record(z.unknown()).optional(),
  position: z
    .object({
      x: z.number(),
      y: z.number(),
    })
    .optional(),
});

const updateNodeSchema = z.object({
  name: z.string().optional(),
  config: z.record(z.unknown()).optional(),
  position: z
    .object({
      x: z.number(),
      y: z.number(),
    })
    .optional(),
});

// Add node to chatbot
chatbotsRoutes.post('/:id/nodes', zValidator('json', createNodeSchema), async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');
  const data = c.req.valid('json');

  const existing = await chatbotsService.findById(id, auth.tenantId);
  if (!existing) {
    throw new HTTPException(404, { message: 'Chatbot not found' });
  }

  const node = await chatbotsService.addNode(id, data);
  return c.json({ node }, 201);
});

// Update node
chatbotsRoutes.patch('/:id/nodes/:nodeId', zValidator('json', updateNodeSchema), async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');
  const nodeId = c.req.param('nodeId');
  const data = c.req.valid('json');

  const existing = await chatbotsService.findById(id, auth.tenantId);
  if (!existing) {
    throw new HTTPException(404, { message: 'Chatbot not found' });
  }

  const node = await chatbotsService.updateNode(nodeId, data);
  return c.json({ node });
});

// Delete node
chatbotsRoutes.delete('/:id/nodes/:nodeId', async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');
  const nodeId = c.req.param('nodeId');

  const existing = await chatbotsService.findById(id, auth.tenantId);
  if (!existing) {
    throw new HTTPException(404, { message: 'Chatbot not found' });
  }

  await chatbotsService.deleteNode(nodeId);
  return c.json({ success: true });
});

// ============ Flow Edges ============

const createEdgeSchema = z.object({
  sourceId: z.string().uuid(),
  targetId: z.string().uuid(),
  label: z.string().optional(),
  condition: z.record(z.unknown()).optional(),
});

// Add edge to chatbot
chatbotsRoutes.post('/:id/edges', zValidator('json', createEdgeSchema), async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');
  const data = c.req.valid('json');

  const existing = await chatbotsService.findById(id, auth.tenantId);
  if (!existing) {
    throw new HTTPException(404, { message: 'Chatbot not found' });
  }

  const edge = await chatbotsService.addEdge(id, data);
  return c.json({ edge }, 201);
});

// Delete edge
chatbotsRoutes.delete('/:id/edges/:edgeId', async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');
  const edgeId = c.req.param('edgeId');

  const existing = await chatbotsService.findById(id, auth.tenantId);
  if (!existing) {
    throw new HTTPException(404, { message: 'Chatbot not found' });
  }

  await chatbotsService.deleteEdge(edgeId);
  return c.json({ success: true });
});

export { chatbotsRoutes };
