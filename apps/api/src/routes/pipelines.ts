import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { HTTPException } from 'hono/http-exception';
import { requireAuth } from '../middleware/auth';
import { pipelinesService } from '../services/pipelines.service';

const pipelinesRoutes = new Hono();

pipelinesRoutes.use('*', requireAuth);

const createPipelineSchema = z.object({
  name: z.string().min(2),
  isDefault: z.boolean().optional(),
  stages: z
    .array(
      z.object({
        name: z.string().min(1),
        color: z.string().optional(),
        order: z.number(),
      })
    )
    .optional(),
});

const updatePipelineSchema = z.object({
  name: z.string().min(2).optional(),
  isDefault: z.boolean().optional(),
});

const createStageSchema = z.object({
  name: z.string().min(1),
  color: z.string().optional(),
  order: z.number(),
});

const updateStageSchema = z.object({
  name: z.string().min(1).optional(),
  color: z.string().optional(),
});

const reorderStagesSchema = z.object({
  stageIds: z.array(z.string().uuid()),
});

// List pipelines
pipelinesRoutes.get('/', async (c) => {
  const auth = c.get('auth');

  const result = await pipelinesService.findAll(auth.tenantId);

  return c.json(result);
});

// Get pipeline by ID
pipelinesRoutes.get('/:id', async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');

  const pipeline = await pipelinesService.findById(id, auth.tenantId);

  if (!pipeline) {
    throw new HTTPException(404, { message: 'Pipeline not found' });
  }

  return c.json(pipeline);
});

// Create pipeline
pipelinesRoutes.post('/', zValidator('json', createPipelineSchema), async (c) => {
  const auth = c.get('auth');
  const data = c.req.valid('json');

  const pipeline = await pipelinesService.create({
    tenantId: auth.tenantId,
    name: data.name,
    isDefault: data.isDefault,
    stages: data.stages,
  });

  return c.json(pipeline, 201);
});

// Update pipeline
pipelinesRoutes.patch(
  '/:id',
  zValidator('json', updatePipelineSchema),
  async (c) => {
    const auth = c.get('auth');
    const id = c.req.param('id');
    const data = c.req.valid('json');

    const pipeline = await pipelinesService.update(id, auth.tenantId, data);

    if (!pipeline) {
      throw new HTTPException(404, { message: 'Pipeline not found' });
    }

    return c.json(pipeline);
  }
);

// Delete pipeline
pipelinesRoutes.delete('/:id', async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');

  const pipeline = await pipelinesService.delete(id, auth.tenantId);

  if (!pipeline) {
    throw new HTTPException(404, { message: 'Pipeline not found' });
  }

  return c.json({ message: 'Pipeline deleted' });
});

// Reorder stages
pipelinesRoutes.post(
  '/:id/stages/reorder',
  zValidator('json', reorderStagesSchema),
  async (c) => {
    const auth = c.get('auth');
    const id = c.req.param('id');
    const { stageIds } = c.req.valid('json');

    // Verify pipeline exists
    const pipeline = await pipelinesService.findById(id, auth.tenantId);
    if (!pipeline) {
      throw new HTTPException(404, { message: 'Pipeline not found' });
    }

    await pipelinesService.reorderStages(id, stageIds);

    const updatedPipeline = await pipelinesService.findById(id, auth.tenantId);

    return c.json(updatedPipeline);
  }
);

// Add stage
pipelinesRoutes.post(
  '/:id/stages',
  zValidator('json', createStageSchema),
  async (c) => {
    const auth = c.get('auth');
    const id = c.req.param('id');
    const data = c.req.valid('json');

    // Verify pipeline exists
    const pipeline = await pipelinesService.findById(id, auth.tenantId);
    if (!pipeline) {
      throw new HTTPException(404, { message: 'Pipeline not found' });
    }

    const stage = await pipelinesService.createStage({
      pipelineId: id,
      name: data.name,
      color: data.color,
      order: data.order,
    });

    return c.json(stage, 201);
  }
);

// Update stage
pipelinesRoutes.patch(
  '/:id/stages/:stageId',
  zValidator('json', updateStageSchema),
  async (c) => {
    const auth = c.get('auth');
    const id = c.req.param('id');
    const stageId = c.req.param('stageId');
    const data = c.req.valid('json');

    // Verify pipeline exists
    const pipeline = await pipelinesService.findById(id, auth.tenantId);
    if (!pipeline) {
      throw new HTTPException(404, { message: 'Pipeline not found' });
    }

    const stage = await pipelinesService.updateStage(stageId, data);

    if (!stage) {
      throw new HTTPException(404, { message: 'Stage not found' });
    }

    return c.json(stage);
  }
);

// Delete stage
pipelinesRoutes.delete('/:id/stages/:stageId', async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');
  const stageId = c.req.param('stageId');

  // Verify pipeline exists
  const pipeline = await pipelinesService.findById(id, auth.tenantId);
  if (!pipeline) {
    throw new HTTPException(404, { message: 'Pipeline not found' });
  }

  const stage = await pipelinesService.deleteStage(stageId);

  if (!stage) {
    throw new HTTPException(404, { message: 'Stage not found' });
  }

  return c.json({ message: 'Stage deleted' });
});

export { pipelinesRoutes };
