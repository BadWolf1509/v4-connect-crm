import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { type AppType, requireAuth } from '../middleware/auth';
import { automationsService } from '../services/automations.service';

const automationsRoutes = new Hono<AppType>();

automationsRoutes.use('*', requireAuth);

const triggerTypeEnum = z.enum([
  'message_received',
  'conversation_opened',
  'conversation_resolved',
  'contact_created',
  'deal_stage_changed',
  'deal_created',
  'tag_added',
  'tag_removed',
  'scheduled',
]);

const statusEnum = z.enum(['active', 'paused', 'draft']);

const actionSchema = z
  .object({
    type: z.string(),
  })
  .passthrough();

const conditionSchema = z.object({
  field: z.string(),
  operator: z.enum([
    'equals',
    'not_equals',
    'contains',
    'not_contains',
    'is_empty',
    'is_not_empty',
  ]),
  value: z.string().optional(),
});

const createAutomationSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  triggerType: triggerTypeEnum,
  triggerConfig: z.record(z.unknown()).optional(),
  conditions: z.array(conditionSchema).optional(),
  actions: z.array(actionSchema).optional(),
  status: statusEnum.optional(),
});

const updateAutomationSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  triggerType: triggerTypeEnum.optional(),
  triggerConfig: z.record(z.unknown()).optional(),
  conditions: z.array(conditionSchema).optional(),
  actions: z.array(actionSchema).optional(),
  status: statusEnum.optional(),
});

// List automations
automationsRoutes.get('/', async (c) => {
  const auth = c.get('auth');
  const { page, limit, status, triggerType } = c.req.query();

  const result = await automationsService.findAll(auth.tenantId, {
    page: page ? Number.parseInt(page, 10) : undefined,
    limit: limit ? Number.parseInt(limit, 10) : undefined,
    status: status as 'active' | 'paused' | 'draft' | undefined,
    triggerType,
  });

  return c.json(result);
});

// Get automation stats
automationsRoutes.get('/stats', async (c) => {
  const auth = c.get('auth');
  const stats = await automationsService.getStats(auth.tenantId);
  return c.json(stats);
});

// Get single automation
automationsRoutes.get('/:id', async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');

  const automation = await automationsService.findById(id, auth.tenantId);

  if (!automation) {
    throw new HTTPException(404, { message: 'Automation not found' });
  }

  return c.json(automation);
});

// Get automation logs
automationsRoutes.get('/:id/logs', async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');
  const { page, limit } = c.req.query();

  const automation = await automationsService.findById(id, auth.tenantId);

  if (!automation) {
    throw new HTTPException(404, { message: 'Automation not found' });
  }

  const result = await automationsService.getLogs(id, auth.tenantId, {
    page: page ? Number.parseInt(page, 10) : undefined,
    limit: limit ? Number.parseInt(limit, 10) : undefined,
  });

  return c.json(result);
});

// Create automation
automationsRoutes.post('/', zValidator('json', createAutomationSchema), async (c) => {
  const auth = c.get('auth');
  const data = c.req.valid('json');

  const automation = await automationsService.create({
    tenantId: auth.tenantId,
    name: data.name,
    description: data.description,
    triggerType: data.triggerType,
    triggerConfig: data.triggerConfig,
    conditions: data.conditions,
    actions: data.actions,
    status: data.status,
    createdBy: auth.userId,
  });

  return c.json(automation, 201);
});

// Update automation
automationsRoutes.patch('/:id', zValidator('json', updateAutomationSchema), async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');
  const data = c.req.valid('json');

  const automation = await automationsService.update(id, auth.tenantId, data);

  if (!automation) {
    throw new HTTPException(404, { message: 'Automation not found' });
  }

  return c.json(automation);
});

// Delete automation
automationsRoutes.delete('/:id', async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');

  const automation = await automationsService.delete(id, auth.tenantId);

  if (!automation) {
    throw new HTTPException(404, { message: 'Automation not found' });
  }

  return c.json({ success: true });
});

// Activate automation
automationsRoutes.post('/:id/activate', async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');

  const automation = await automationsService.activate(id, auth.tenantId);

  if (!automation) {
    throw new HTTPException(404, { message: 'Automation not found' });
  }

  return c.json(automation);
});

// Pause automation
automationsRoutes.post('/:id/pause', async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');

  const automation = await automationsService.pause(id, auth.tenantId);

  if (!automation) {
    throw new HTTPException(404, { message: 'Automation not found' });
  }

  return c.json(automation);
});

export { automationsRoutes };
