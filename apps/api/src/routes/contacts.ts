import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { type AppType, requireAuth } from '../middleware/auth';
import { contactsService } from '../services/contacts.service';

const contactsRoutes = new Hono<AppType>();

contactsRoutes.use('*', requireAuth);

const createContactSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  tags: z.array(z.string()).optional(),
  customFields: z.record(z.any()).optional(),
  externalId: z.string().optional(),
});

const updateContactSchema = createContactSchema.partial();

// List contacts
contactsRoutes.get('/', async (c) => {
  const auth = c.get('auth');
  const { page = '1', limit = '20', search, tag } = c.req.query();

  const result = await contactsService.findAll({
    tenantId: auth.tenantId,
    search,
    tag,
    page: Number.parseInt(page),
    limit: Number.parseInt(limit),
  });

  return c.json(result);
});

// Get contact by ID
contactsRoutes.get('/:id', async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');

  const contact = await contactsService.findById(id, auth.tenantId);

  if (!contact) {
    throw new HTTPException(404, { message: 'Contact not found' });
  }

  return c.json(contact);
});

// Create contact
contactsRoutes.post('/', zValidator('json', createContactSchema), async (c) => {
  const auth = c.get('auth');
  const data = c.req.valid('json');

  const contact = await contactsService.create({
    tenantId: auth.tenantId,
    name: data.name,
    email: data.email,
    phone: data.phone,
    avatarUrl: data.avatarUrl,
    tags: data.tags,
    customFields: data.customFields,
    externalId: data.externalId,
  });

  return c.json(contact, 201);
});

// Update contact
contactsRoutes.patch('/:id', zValidator('json', updateContactSchema), async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');
  const data = c.req.valid('json');

  const contact = await contactsService.update(id, auth.tenantId, data);

  if (!contact) {
    throw new HTTPException(404, { message: 'Contact not found' });
  }

  return c.json(contact);
});

// Delete contact
contactsRoutes.delete('/:id', async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');

  const contact = await contactsService.delete(id, auth.tenantId);

  if (!contact) {
    throw new HTTPException(404, { message: 'Contact not found' });
  }

  return c.json({ message: 'Contact deleted' });
});

// Add tag to contact
contactsRoutes.post('/:id/tags', async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');
  const { tag } = await c.req.json();

  if (!tag || typeof tag !== 'string') {
    throw new HTTPException(400, { message: 'Tag is required' });
  }

  const contact = await contactsService.addTag(id, auth.tenantId, tag);

  if (!contact) {
    throw new HTTPException(404, { message: 'Contact not found' });
  }

  return c.json(contact);
});

// Remove tag from contact
contactsRoutes.delete('/:id/tags/:tag', async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');
  const tag = c.req.param('tag');

  const contact = await contactsService.removeTag(id, auth.tenantId, tag);

  if (!contact) {
    throw new HTTPException(404, { message: 'Contact not found' });
  }

  return c.json(contact);
});

export { contactsRoutes };
