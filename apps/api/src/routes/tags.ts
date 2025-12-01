import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { type AppType, requireAuth } from '../middleware/auth';
import { tagsService } from '../services/tags.service';

const tagsRoutes = new Hono<AppType>();

tagsRoutes.use('*', requireAuth);

const createTagSchema = z.object({
  name: z.string().min(1).max(50),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  description: z.string().max(200).optional(),
});

const updateTagSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  description: z.string().max(200).optional(),
});

const _contactTagsSchema = z.object({
  tagIds: z.array(z.string().uuid()),
});

const bulkTagSchema = z.object({
  contactIds: z.array(z.string().uuid()),
});

// List all tags
tagsRoutes.get('/', async (c) => {
  const auth = c.get('auth');
  const result = await tagsService.findAll(auth.tenantId);
  return c.json(result);
});

// Get tag by ID
tagsRoutes.get('/:id', async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');

  const tag = await tagsService.findById(id, auth.tenantId);

  if (!tag) {
    throw new HTTPException(404, { message: 'Tag not found' });
  }

  return c.json(tag);
});

// Create tag
tagsRoutes.post('/', zValidator('json', createTagSchema), async (c) => {
  const auth = c.get('auth');
  const data = c.req.valid('json');

  // Check for duplicate name
  const existing = await tagsService.findByName(data.name, auth.tenantId);
  if (existing) {
    throw new HTTPException(400, { message: 'A tag with this name already exists' });
  }

  const tag = await tagsService.create({
    tenantId: auth.tenantId,
    ...data,
  });

  return c.json(tag, 201);
});

// Update tag
tagsRoutes.patch('/:id', zValidator('json', updateTagSchema), async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');
  const data = c.req.valid('json');

  // Check if tag exists
  const existing = await tagsService.findById(id, auth.tenantId);
  if (!existing) {
    throw new HTTPException(404, { message: 'Tag not found' });
  }

  // Check for duplicate name if name is being changed
  if (data.name && data.name.toLowerCase() !== existing.name) {
    const duplicate = await tagsService.findByName(data.name, auth.tenantId);
    if (duplicate) {
      throw new HTTPException(400, { message: 'A tag with this name already exists' });
    }
  }

  const tag = await tagsService.update(id, auth.tenantId, data);

  return c.json(tag);
});

// Delete tag
tagsRoutes.delete('/:id', async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');

  const tag = await tagsService.delete(id, auth.tenantId);

  if (!tag) {
    throw new HTTPException(404, { message: 'Tag not found' });
  }

  return c.json({ success: true });
});

// Get contacts by tag
tagsRoutes.get('/:id/contacts', async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');

  const tag = await tagsService.findById(id, auth.tenantId);
  if (!tag) {
    throw new HTTPException(404, { message: 'Tag not found' });
  }

  const result = await tagsService.getContactsByTag(id, auth.tenantId);
  return c.json(result);
});

// Bulk add tag to contacts
tagsRoutes.post('/:id/contacts', zValidator('json', bulkTagSchema), async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');
  const { contactIds } = c.req.valid('json');

  const tag = await tagsService.findById(id, auth.tenantId);
  if (!tag) {
    throw new HTTPException(404, { message: 'Tag not found' });
  }

  const result = await tagsService.bulkAddTagToContacts(id, contactIds);

  return c.json({ added: result.length });
});

// Bulk remove tag from contacts
tagsRoutes.delete('/:id/contacts', zValidator('json', bulkTagSchema), async (c) => {
  const _auth = c.get('auth');
  const id = c.req.param('id');
  const { contactIds } = c.req.valid('json');

  const result = await tagsService.bulkRemoveTagFromContacts(id, contactIds);

  return c.json({ removed: result.length });
});

export { tagsRoutes };
