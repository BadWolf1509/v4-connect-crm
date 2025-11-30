import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockConversation } from '../mocks/db.mock';

// Mock the conversations service
const mockConversationsService = {
  findAll: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  assign: vi.fn(),
  unassign: vi.fn(),
  resolve: vi.fn(),
  reopen: vi.fn(),
  snooze: vi.fn(),
};

vi.mock('../../services/conversations.service', () => ({
  conversationsService: mockConversationsService,
}));

// Import after mocking
const { conversationsRoutes } = await import('../../routes/conversations');

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

const validUserId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const validInboxId = 'b1ffcd00-0d1c-5ef9-cc7e-7cc0ce491b22';

describe('Conversations Routes', () => {
  let app: Hono;

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono();
    app.route('/conversations', conversationsRoutes);
  });

  describe('GET /conversations', () => {
    it('should return paginated list of conversations', async () => {
      const mockConversations = [
        createMockConversation(),
        createMockConversation({ id: 'conv-456' }),
      ];
      mockConversationsService.findAll.mockResolvedValue({
        conversations: mockConversations,
        pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
      });

      const res = await app.request('/conversations', {
        method: 'GET',
        headers: authHeaders,
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.conversations).toHaveLength(2);
      expect(data.pagination.total).toBe(2);
    });

    it('should filter by status', async () => {
      mockConversationsService.findAll.mockResolvedValue({
        conversations: [createMockConversation({ status: 'open' })],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });

      const res = await app.request('/conversations?status=open', {
        method: 'GET',
        headers: authHeaders,
      });

      expect(res.status).toBe(200);
      expect(mockConversationsService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'open' }),
      );
    });

    it('should filter by inboxId', async () => {
      mockConversationsService.findAll.mockResolvedValue({
        conversations: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      });

      const res = await app.request('/conversations?inboxId=inbox-123', {
        method: 'GET',
        headers: authHeaders,
      });

      expect(res.status).toBe(200);
      expect(mockConversationsService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ inboxId: 'inbox-123' }),
      );
    });

    it('should filter by assigneeId', async () => {
      mockConversationsService.findAll.mockResolvedValue({
        conversations: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      });

      const res = await app.request('/conversations?assigneeId=user-123', {
        method: 'GET',
        headers: authHeaders,
      });

      expect(res.status).toBe(200);
      expect(mockConversationsService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ assigneeId: 'user-123' }),
      );
    });

    it('should support pagination', async () => {
      mockConversationsService.findAll.mockResolvedValue({
        conversations: [],
        pagination: { page: 2, limit: 10, total: 50, totalPages: 5 },
      });

      const res = await app.request('/conversations?page=2&limit=10', {
        method: 'GET',
        headers: authHeaders,
      });

      expect(res.status).toBe(200);
      expect(mockConversationsService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2, limit: 10 }),
      );
    });
  });

  describe('GET /conversations/:id', () => {
    it('should return a conversation by id', async () => {
      mockConversationsService.findById.mockResolvedValue(createMockConversation());

      const res = await app.request('/conversations/conversation-123', {
        method: 'GET',
        headers: authHeaders,
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.id).toBe('conversation-123');
    });

    it('should return 404 if conversation not found', async () => {
      mockConversationsService.findById.mockResolvedValue(null);

      const res = await app.request('/conversations/nonexistent', {
        method: 'GET',
        headers: authHeaders,
      });

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /conversations/:id/status', () => {
    it('should update conversation status', async () => {
      mockConversationsService.update.mockResolvedValue(
        createMockConversation({ status: 'resolved' }),
      );

      const res = await app.request('/conversations/conversation-123/status', {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ status: 'resolved' }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe('resolved');
    });

    it('should return 404 if conversation not found', async () => {
      mockConversationsService.update.mockResolvedValue(null);

      const res = await app.request('/conversations/nonexistent/status', {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ status: 'open' }),
      });

      expect(res.status).toBe(404);
    });

    it('should validate status enum', async () => {
      const res = await app.request('/conversations/conversation-123/status', {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ status: 'invalid' }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /conversations/:id/assign', () => {
    it('should assign conversation to user', async () => {
      mockConversationsService.assign.mockResolvedValue(
        createMockConversation({ assigneeId: validUserId }),
      );

      const res = await app.request('/conversations/conversation-123/assign', {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ userId: validUserId }),
      });

      expect(res.status).toBe(200);
      expect(mockConversationsService.assign).toHaveBeenCalledWith(
        'conversation-123',
        'test-tenant-id',
        validUserId,
      );
    });

    it('should return 404 if conversation not found', async () => {
      mockConversationsService.assign.mockResolvedValue(null);

      const res = await app.request('/conversations/nonexistent/assign', {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ userId: validUserId }),
      });

      expect(res.status).toBe(404);
    });

    it('should validate userId is UUID', async () => {
      const res = await app.request('/conversations/conversation-123/assign', {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ userId: 'not-a-uuid' }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /conversations/:id/unassign', () => {
    it('should unassign conversation', async () => {
      mockConversationsService.unassign.mockResolvedValue(
        createMockConversation({ assigneeId: null }),
      );

      const res = await app.request('/conversations/conversation-123/unassign', {
        method: 'POST',
        headers: authHeaders,
      });

      expect(res.status).toBe(200);
      expect(mockConversationsService.unassign).toHaveBeenCalledWith(
        'conversation-123',
        'test-tenant-id',
      );
    });

    it('should return 404 if conversation not found', async () => {
      mockConversationsService.unassign.mockResolvedValue(null);

      const res = await app.request('/conversations/nonexistent/unassign', {
        method: 'POST',
        headers: authHeaders,
      });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /conversations/:id/resolve', () => {
    it('should resolve conversation', async () => {
      mockConversationsService.resolve.mockResolvedValue(
        createMockConversation({ status: 'resolved' }),
      );

      const res = await app.request('/conversations/conversation-123/resolve', {
        method: 'POST',
        headers: authHeaders,
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe('resolved');
    });

    it('should return 404 if conversation not found', async () => {
      mockConversationsService.resolve.mockResolvedValue(null);

      const res = await app.request('/conversations/nonexistent/resolve', {
        method: 'POST',
        headers: authHeaders,
      });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /conversations/:id/reopen', () => {
    it('should reopen conversation', async () => {
      mockConversationsService.reopen.mockResolvedValue(createMockConversation({ status: 'open' }));

      const res = await app.request('/conversations/conversation-123/reopen', {
        method: 'POST',
        headers: authHeaders,
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe('open');
    });

    it('should return 404 if conversation not found', async () => {
      mockConversationsService.reopen.mockResolvedValue(null);

      const res = await app.request('/conversations/nonexistent/reopen', {
        method: 'POST',
        headers: authHeaders,
      });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /conversations/:id/snooze', () => {
    it('should snooze conversation', async () => {
      const snoozeDate = new Date(Date.now() + 86400000).toISOString();
      mockConversationsService.snooze.mockResolvedValue(
        createMockConversation({ status: 'snoozed', snoozedUntil: snoozeDate }),
      );

      const res = await app.request('/conversations/conversation-123/snooze', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ until: snoozeDate }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe('snoozed');
    });

    it('should return 404 if conversation not found', async () => {
      mockConversationsService.snooze.mockResolvedValue(null);
      const snoozeDate = new Date(Date.now() + 86400000).toISOString();

      const res = await app.request('/conversations/nonexistent/snooze', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ until: snoozeDate }),
      });

      expect(res.status).toBe(404);
    });

    it('should validate until is datetime', async () => {
      const res = await app.request('/conversations/conversation-123/snooze', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ until: 'not-a-date' }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /conversations/:id/transfer', () => {
    it('should transfer conversation to another inbox', async () => {
      mockConversationsService.update.mockResolvedValue(
        createMockConversation({ inboxId: validInboxId }),
      );

      const res = await app.request('/conversations/conversation-123/transfer', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ inboxId: validInboxId }),
      });

      expect(res.status).toBe(200);
      expect(mockConversationsService.update).toHaveBeenCalledWith(
        'conversation-123',
        'test-tenant-id',
        { inboxId: validInboxId },
      );
    });

    it('should return 404 if conversation not found', async () => {
      mockConversationsService.update.mockResolvedValue(null);

      const res = await app.request('/conversations/nonexistent/transfer', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ inboxId: validInboxId }),
      });

      expect(res.status).toBe(404);
    });

    it('should validate inboxId is UUID', async () => {
      const res = await app.request('/conversations/conversation-123/transfer', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ inboxId: 'not-a-uuid' }),
      });

      expect(res.status).toBe(400);
    });
  });
});
