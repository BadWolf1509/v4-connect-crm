import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockContact } from '../mocks/db.mock';

// Mock the contacts service
const mockContactsService = {
  findAll: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  addTag: vi.fn(),
  removeTag: vi.fn(),
};

vi.mock('../../services/contacts.service', () => ({
  contactsService: mockContactsService,
}));

// Import after mocking
const { contactsRoutes } = await import('../../routes/contacts');

// Create a valid test token
const createAuthToken = () => {
  const session = {
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      role: 'admin',
      tenantId: 'test-tenant-id',
    },
    expires: new Date(Date.now() + 3600000).toISOString(),
  };
  return Buffer.from(JSON.stringify(session)).toString('base64');
};

const authHeaders = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${createAuthToken()}`,
};

describe('Contacts Routes', () => {
  let app: Hono;

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono();
    app.route('/contacts', contactsRoutes);
  });

  describe('GET /contacts', () => {
    it('should return paginated list of contacts', async () => {
      const mockContacts = [createMockContact(), createMockContact({ id: 'contact-456' })];
      mockContactsService.findAll.mockResolvedValue({
        contacts: mockContacts,
        total: 2,
        page: 1,
        limit: 20,
      });

      const res = await app.request('/contacts', {
        method: 'GET',
        headers: authHeaders,
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.contacts).toHaveLength(2);
      expect(data.total).toBe(2);
    });

    it('should support search query', async () => {
      mockContactsService.findAll.mockResolvedValue({
        contacts: [createMockContact()],
        total: 1,
        page: 1,
        limit: 20,
      });

      const res = await app.request('/contacts?search=john', {
        method: 'GET',
        headers: authHeaders,
      });

      expect(res.status).toBe(200);
      expect(mockContactsService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'john' }),
      );
    });

    it('should support tag filter', async () => {
      mockContactsService.findAll.mockResolvedValue({
        contacts: [],
        total: 0,
        page: 1,
        limit: 20,
      });

      const res = await app.request('/contacts?tag=vip', {
        method: 'GET',
        headers: authHeaders,
      });

      expect(res.status).toBe(200);
      expect(mockContactsService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ tag: 'vip' }),
      );
    });

    it('should support pagination', async () => {
      mockContactsService.findAll.mockResolvedValue({
        contacts: [],
        total: 100,
        page: 3,
        limit: 10,
      });

      const res = await app.request('/contacts?page=3&limit=10', {
        method: 'GET',
        headers: authHeaders,
      });

      expect(res.status).toBe(200);
      expect(mockContactsService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ page: 3, limit: 10 }),
      );
    });
  });

  describe('GET /contacts/:id', () => {
    it('should return a contact by id', async () => {
      mockContactsService.findById.mockResolvedValue(createMockContact());

      const res = await app.request('/contacts/contact-123', {
        method: 'GET',
        headers: authHeaders,
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.id).toBe('contact-123');
    });

    it('should return 404 if contact not found', async () => {
      mockContactsService.findById.mockResolvedValue(null);

      const res = await app.request('/contacts/nonexistent', {
        method: 'GET',
        headers: authHeaders,
      });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /contacts', () => {
    it('should create a new contact', async () => {
      mockContactsService.create.mockResolvedValue(createMockContact());

      const res = await app.request('/contacts', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+5511999999999',
        }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.name).toBe('John Doe');
    });

    it('should validate required name field', async () => {
      const res = await app.request('/contacts', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          email: 'john@example.com',
          // missing name
        }),
      });

      expect(res.status).toBe(400);
    });

    it('should validate name minimum length', async () => {
      const res = await app.request('/contacts', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          name: 'J', // too short
        }),
      });

      expect(res.status).toBe(400);
    });

    it('should validate email format', async () => {
      const res = await app.request('/contacts', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          name: 'John Doe',
          email: 'invalid-email',
        }),
      });

      expect(res.status).toBe(400);
    });

    it('should create contact with tags', async () => {
      mockContactsService.create.mockResolvedValue(
        createMockContact({ tags: ['vip', 'customer'] }),
      );

      const res = await app.request('/contacts', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          name: 'John Doe',
          tags: ['vip', 'customer'],
        }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.tags).toContain('vip');
    });
  });

  describe('PATCH /contacts/:id', () => {
    it('should update a contact', async () => {
      mockContactsService.update.mockResolvedValue(createMockContact({ name: 'Jane Doe' }));

      const res = await app.request('/contacts/contact-123', {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({
          name: 'Jane Doe',
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.name).toBe('Jane Doe');
    });

    it('should return 404 if contact not found', async () => {
      mockContactsService.update.mockResolvedValue(null);

      const res = await app.request('/contacts/nonexistent', {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ name: 'New Name' }),
      });

      expect(res.status).toBe(404);
    });

    it('should allow partial updates', async () => {
      mockContactsService.update.mockResolvedValue(createMockContact({ phone: '+5511888888888' }));

      const res = await app.request('/contacts/contact-123', {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({
          phone: '+5511888888888',
        }),
      });

      expect(res.status).toBe(200);
      expect(mockContactsService.update).toHaveBeenCalledWith('contact-123', 'test-tenant-id', {
        phone: '+5511888888888',
      });
    });
  });

  describe('DELETE /contacts/:id', () => {
    it('should delete a contact', async () => {
      mockContactsService.delete.mockResolvedValue(createMockContact());

      const res = await app.request('/contacts/contact-123', {
        method: 'DELETE',
        headers: authHeaders,
      });

      expect(res.status).toBe(200);
      expect(mockContactsService.delete).toHaveBeenCalledWith('contact-123', 'test-tenant-id');
    });

    it('should return 404 if contact not found', async () => {
      mockContactsService.delete.mockResolvedValue(null);

      const res = await app.request('/contacts/nonexistent', {
        method: 'DELETE',
        headers: authHeaders,
      });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /contacts/:id/tags', () => {
    it('should add a tag to contact', async () => {
      mockContactsService.addTag.mockResolvedValue(createMockContact({ tags: ['new-tag'] }));

      const res = await app.request('/contacts/contact-123/tags', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ tag: 'new-tag' }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.tags).toContain('new-tag');
    });

    it('should validate tag is required', async () => {
      const res = await app.request('/contacts/contact-123/tags', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
    });

    it('should return 404 if contact not found', async () => {
      mockContactsService.addTag.mockResolvedValue(null);

      const res = await app.request('/contacts/nonexistent/tags', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ tag: 'new-tag' }),
      });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /contacts/:id/tags/:tag', () => {
    it('should remove a tag from contact', async () => {
      mockContactsService.removeTag.mockResolvedValue(createMockContact({ tags: [] }));

      const res = await app.request('/contacts/contact-123/tags/old-tag', {
        method: 'DELETE',
        headers: authHeaders,
      });

      expect(res.status).toBe(200);
      expect(mockContactsService.removeTag).toHaveBeenCalledWith(
        'contact-123',
        'test-tenant-id',
        'old-tag',
      );
    });

    it('should return 404 if contact not found', async () => {
      mockContactsService.removeTag.mockResolvedValue(null);

      const res = await app.request('/contacts/nonexistent/tags/some-tag', {
        method: 'DELETE',
        headers: authHeaders,
      });

      expect(res.status).toBe(404);
    });
  });
});
