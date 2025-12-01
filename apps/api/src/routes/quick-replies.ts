import { zValidator } from '@hono/zod-validator';
import { and, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { db, schema } from '../lib/db';
import { type AppType, requireAuth } from '../middleware/auth';

const { quickReplies } = schema;

const quickRepliesRoutes = new Hono<AppType>();

quickRepliesRoutes.use('*', requireAuth);

const createQuickReplySchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  content: z.string().min(1, 'Conteúdo é obrigatório'),
  shortcut: z.string().optional(),
  category: z.string().optional().default('Geral'),
});

const updateQuickReplySchema = createQuickReplySchema.partial();

// List quick replies
quickRepliesRoutes.get('/', async (c) => {
  const auth = c.get('auth');
  const { category } = c.req.query();

  const conditions = [eq(quickReplies.tenantId, auth.tenantId)];

  if (category) {
    conditions.push(eq(quickReplies.category, category));
  }

  const data = await db
    .select()
    .from(quickReplies)
    .where(and(...conditions))
    .orderBy(quickReplies.category, quickReplies.title);

  return c.json({ quickReplies: data });
});

// Get quick reply by ID
quickRepliesRoutes.get('/:id', async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');

  const [quickReply] = await db
    .select()
    .from(quickReplies)
    .where(and(eq(quickReplies.id, id), eq(quickReplies.tenantId, auth.tenantId)))
    .limit(1);

  if (!quickReply) {
    throw new HTTPException(404, { message: 'Quick reply not found' });
  }

  return c.json(quickReply);
});

// Create quick reply
quickRepliesRoutes.post('/', zValidator('json', createQuickReplySchema), async (c) => {
  const auth = c.get('auth');
  const data = c.req.valid('json');

  const [quickReply] = await db
    .insert(quickReplies)
    .values({
      tenantId: auth.tenantId,
      title: data.title,
      content: data.content,
      shortcut: data.shortcut,
      category: data.category || 'Geral',
    })
    .returning();

  return c.json(quickReply, 201);
});

// Update quick reply
quickRepliesRoutes.patch('/:id', zValidator('json', updateQuickReplySchema), async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');
  const data = c.req.valid('json');

  const [quickReply] = await db
    .update(quickReplies)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(and(eq(quickReplies.id, id), eq(quickReplies.tenantId, auth.tenantId)))
    .returning();

  if (!quickReply) {
    throw new HTTPException(404, { message: 'Quick reply not found' });
  }

  return c.json(quickReply);
});

// Delete quick reply
quickRepliesRoutes.delete('/:id', async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');

  const [deleted] = await db
    .delete(quickReplies)
    .where(and(eq(quickReplies.id, id), eq(quickReplies.tenantId, auth.tenantId)))
    .returning();

  if (!deleted) {
    throw new HTTPException(404, { message: 'Quick reply not found' });
  }

  return c.json({ success: true });
});

export { quickRepliesRoutes };
