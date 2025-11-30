import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockChannel } from '../mocks/db.mock';

// Mock the services
const mockInboxesService = {
  findAll: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

const mockChannelsService = {
  findById: vi.fn(),
};

vi.mock('../../services/inboxes.service', () => ({
  inboxesService: mockInboxesService,
}));

vi.mock('../../services/channels.service', () => ({
  channelsService: mockChannelsService,
}));

// Import after mocking
const { inboxesRoutes } = await import('../../routes/inboxes');

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

const validChannelId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

const createMockInbox = (overrides = {}) => ({
  id: 'inbox-123',
  tenantId: 'test-tenant-id',
  channelId: validChannelId,
  name: 'Main Inbox',
  isDefault: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe('Inboxes Routes', () => {
  let app: Hono;

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono();
    app.route('/inboxes', inboxesRoutes);
  });

  describe('GET /inboxes', () => {
    it('should return list of inboxes', async () => {
      const mockInboxes = [
        createMockInbox(),
        createMockInbox({ id: 'inbox-456', name: 'Secondary' }),
      ];
      mockInboxesService.findAll.mockResolvedValue({ inboxes: mockInboxes });

      const res = await app.request('/inboxes', {
        method: 'GET',
        headers: authHeaders,
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.inboxes).toHaveLength(2);
    });

    it('should filter by channelId', async () => {
      mockInboxesService.findAll.mockResolvedValue({ inboxes: [createMockInbox()] });

      const res = await app.request(`/inboxes?channelId=${validChannelId}`, {
        method: 'GET',
        headers: authHeaders,
      });

      expect(res.status).toBe(200);
      expect(mockInboxesService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ channelId: validChannelId }),
      );
    });
  });

  describe('GET /inboxes/:id', () => {
    it('should return an inbox by id', async () => {
      mockInboxesService.findById.mockResolvedValue(createMockInbox());

      const res = await app.request('/inboxes/inbox-123', {
        method: 'GET',
        headers: authHeaders,
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.id).toBe('inbox-123');
    });

    it('should return 404 if inbox not found', async () => {
      mockInboxesService.findById.mockResolvedValue(null);

      const res = await app.request('/inboxes/nonexistent', {
        method: 'GET',
        headers: authHeaders,
      });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /inboxes', () => {
    it('should create a new inbox', async () => {
      mockChannelsService.findById.mockResolvedValue(createMockChannel());
      mockInboxesService.create.mockResolvedValue(createMockInbox());

      const res = await app.request('/inboxes', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          channelId: validChannelId,
          name: 'Main Inbox',
          isDefault: true,
        }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.name).toBe('Main Inbox');
    });

    it('should return 404 if channel not found', async () => {
      mockChannelsService.findById.mockResolvedValue(null);

      const res = await app.request('/inboxes', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          channelId: validChannelId,
          name: 'Main Inbox',
        }),
      });

      expect(res.status).toBe(404);
    });

    it('should validate name minimum length', async () => {
      const res = await app.request('/inboxes', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          channelId: validChannelId,
          name: 'X',
        }),
      });

      expect(res.status).toBe(400);
    });

    it('should validate channelId is UUID', async () => {
      const res = await app.request('/inboxes', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          channelId: 'not-a-uuid',
          name: 'Main Inbox',
        }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /inboxes/:id', () => {
    it('should update an inbox', async () => {
      mockInboxesService.update.mockResolvedValue(createMockInbox({ name: 'Updated Inbox' }));

      const res = await app.request('/inboxes/inbox-123', {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ name: 'Updated Inbox' }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.name).toBe('Updated Inbox');
    });

    it('should return 404 if inbox not found', async () => {
      mockInboxesService.update.mockResolvedValue(null);

      const res = await app.request('/inboxes/nonexistent', {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ name: 'New Name' }),
      });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /inboxes/:id', () => {
    it('should delete an inbox', async () => {
      mockInboxesService.delete.mockResolvedValue(createMockInbox());

      const res = await app.request('/inboxes/inbox-123', {
        method: 'DELETE',
        headers: authHeaders,
      });

      expect(res.status).toBe(200);
      expect(mockInboxesService.delete).toHaveBeenCalledWith('inbox-123', 'test-tenant-id');
    });

    it('should return 404 if inbox not found', async () => {
      mockInboxesService.delete.mockResolvedValue(null);

      const res = await app.request('/inboxes/nonexistent', {
        method: 'DELETE',
        headers: authHeaders,
      });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /inboxes/:id/default', () => {
    it('should set inbox as default', async () => {
      mockInboxesService.update.mockResolvedValue(createMockInbox({ isDefault: true }));

      const res = await app.request('/inboxes/inbox-123/default', {
        method: 'POST',
        headers: authHeaders,
      });

      expect(res.status).toBe(200);
      expect(mockInboxesService.update).toHaveBeenCalledWith('inbox-123', 'test-tenant-id', {
        isDefault: true,
      });
    });

    it('should return 404 if inbox not found', async () => {
      mockInboxesService.update.mockResolvedValue(null);

      const res = await app.request('/inboxes/nonexistent/default', {
        method: 'POST',
        headers: authHeaders,
      });

      expect(res.status).toBe(404);
    });
  });
});
