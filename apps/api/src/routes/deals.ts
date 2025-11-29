import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { type AppType, requireAuth } from '../middleware/auth';
import { dealsService } from '../services/deals.service';

const dealsRoutes = new Hono<AppType>();

dealsRoutes.use('*', requireAuth);

const createDealSchema = z.object({
  title: z.string().min(2),
  value: z.string().optional(),
  currency: z.string().optional(),
  pipelineId: z.string().uuid(),
  stageId: z.string().uuid(),
  contactId: z.string().uuid(),
  assigneeId: z.string().uuid().optional(),
  expectedCloseDate: z.string().datetime().optional(),
});

const updateDealSchema = z.object({
  title: z.string().min(2).optional(),
  value: z.string().optional(),
  currency: z.string().optional(),
  stageId: z.string().uuid().optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  expectedCloseDate: z.string().datetime().nullable().optional(),
});

const moveDealSchema = z.object({
  stageId: z.string().uuid(),
  order: z.number().optional(),
});

const lostReasonSchema = z.object({
  reason: z.string().optional(),
});

const createActivitySchema = z.object({
  type: z.enum(['call', 'meeting', 'email', 'task', 'note']),
  title: z.string().min(1),
  description: z.string().optional(),
  dueAt: z.string().datetime().optional(),
});

// List deals
dealsRoutes.get('/', async (c) => {
  const auth = c.get('auth');
  const { pipelineId, stageId, assigneeId, status, page = '1', limit = '50' } = c.req.query();

  const result = await dealsService.findAll({
    tenantId: auth.tenantId,
    pipelineId,
    stageId,
    assigneeId,
    status: status as 'open' | 'won' | 'lost' | undefined,
    page: Number.parseInt(page),
    limit: Number.parseInt(limit),
  });

  return c.json(result);
});

// Get deal by ID
dealsRoutes.get('/:id', async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');

  const deal = await dealsService.findById(id, auth.tenantId);

  if (!deal) {
    throw new HTTPException(404, { message: 'Deal not found' });
  }

  return c.json(deal);
});

// Create deal
dealsRoutes.post('/', zValidator('json', createDealSchema), async (c) => {
  const auth = c.get('auth');
  const data = c.req.valid('json');

  const deal = await dealsService.create({
    tenantId: auth.tenantId,
    pipelineId: data.pipelineId,
    stageId: data.stageId,
    contactId: data.contactId,
    assigneeId: data.assigneeId,
    title: data.title,
    value: data.value,
    currency: data.currency,
    expectedCloseDate: data.expectedCloseDate ? new Date(data.expectedCloseDate) : undefined,
  });

  return c.json(deal, 201);
});

// Update deal
dealsRoutes.patch('/:id', zValidator('json', updateDealSchema), async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');
  const data = c.req.valid('json');

  const deal = await dealsService.update(id, auth.tenantId, {
    ...data,
    expectedCloseDate: data.expectedCloseDate
      ? new Date(data.expectedCloseDate)
      : data.expectedCloseDate === null
        ? null
        : undefined,
  });

  if (!deal) {
    throw new HTTPException(404, { message: 'Deal not found' });
  }

  return c.json(deal);
});

// Move deal to stage
dealsRoutes.post('/:id/move', zValidator('json', moveDealSchema), async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');
  const { stageId, order } = c.req.valid('json');

  const deal = await dealsService.moveToStage(id, auth.tenantId, stageId, order);

  if (!deal) {
    throw new HTTPException(404, { message: 'Deal not found' });
  }

  return c.json(deal);
});

// Mark deal as won
dealsRoutes.post('/:id/won', async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');

  const deal = await dealsService.markAsWon(id, auth.tenantId);

  if (!deal) {
    throw new HTTPException(404, { message: 'Deal not found' });
  }

  return c.json(deal);
});

// Mark deal as lost
dealsRoutes.post('/:id/lost', zValidator('json', lostReasonSchema), async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');
  const { reason } = c.req.valid('json');

  const deal = await dealsService.markAsLost(id, auth.tenantId, reason);

  if (!deal) {
    throw new HTTPException(404, { message: 'Deal not found' });
  }

  return c.json(deal);
});

// Reopen deal
dealsRoutes.post('/:id/reopen', async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');

  const deal = await dealsService.reopen(id, auth.tenantId);

  if (!deal) {
    throw new HTTPException(404, { message: 'Deal not found' });
  }

  return c.json(deal);
});

// Delete deal
dealsRoutes.delete('/:id', async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');

  const deal = await dealsService.delete(id, auth.tenantId);

  if (!deal) {
    throw new HTTPException(404, { message: 'Deal not found' });
  }

  return c.json({ message: 'Deal deleted' });
});

// Get deal activities
dealsRoutes.get('/:id/activities', async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');

  // Verify deal exists
  const deal = await dealsService.findById(id, auth.tenantId);
  if (!deal) {
    throw new HTTPException(404, { message: 'Deal not found' });
  }

  const activities = await dealsService.getActivities(id);

  return c.json({ activities });
});

// Add activity to deal
dealsRoutes.post('/:id/activities', zValidator('json', createActivitySchema), async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');
  const data = c.req.valid('json');

  // Verify deal exists
  const deal = await dealsService.findById(id, auth.tenantId);
  if (!deal) {
    throw new HTTPException(404, { message: 'Deal not found' });
  }

  const activity = await dealsService.createActivity({
    dealId: id,
    userId: auth.userId,
    type: data.type,
    title: data.title,
    description: data.description,
    dueAt: data.dueAt ? new Date(data.dueAt) : undefined,
  });

  return c.json(activity, 201);
});

// Complete activity
dealsRoutes.post('/:id/activities/:activityId/complete', async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');
  const activityId = c.req.param('activityId');

  // Verify deal exists
  const deal = await dealsService.findById(id, auth.tenantId);
  if (!deal) {
    throw new HTTPException(404, { message: 'Deal not found' });
  }

  const activity = await dealsService.completeActivity(activityId);

  if (!activity) {
    throw new HTTPException(404, { message: 'Activity not found' });
  }

  return c.json(activity);
});

// Delete activity
dealsRoutes.delete('/:id/activities/:activityId', async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');
  const activityId = c.req.param('activityId');

  // Verify deal exists
  const deal = await dealsService.findById(id, auth.tenantId);
  if (!deal) {
    throw new HTTPException(404, { message: 'Deal not found' });
  }

  const activity = await dealsService.deleteActivity(activityId);

  if (!activity) {
    throw new HTTPException(404, { message: 'Activity not found' });
  }

  return c.json({ message: 'Activity deleted' });
});

export { dealsRoutes };
