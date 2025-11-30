import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockChannel, createMockConversation, createMockMessage } from '../mocks/db.mock';

// Mock the services
const mockMessagesService = {
  findByConversation: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  getUnreadCount: vi.fn(),
  markAsRead: vi.fn(),
};

const mockConversationsService = {
  findById: vi.fn(),
  update: vi.fn(),
};

const mockSocketEventsService = {
  emitNewMessage: vi.fn(),
};

const mockChannelsService = {
  findById: vi.fn(),
  findByTenant: vi.fn(),
};

const mockEvolutionService = {
  sendText: vi.fn(),
  sendImage: vi.fn(),
  sendAudio: vi.fn(),
  sendDocument: vi.fn(),
  sendMedia: vi.fn(),
};

const mockMetaService = {
  sendInstagramText: vi.fn(),
  sendInstagramMedia: vi.fn(),
  sendMessengerText: vi.fn(),
  sendMessengerMedia: vi.fn(),
};

vi.mock('../../services/messages.service', () => ({
  messagesService: mockMessagesService,
}));

vi.mock('../../services/conversations.service', () => ({
  conversationsService: mockConversationsService,
}));

vi.mock('../../services/socket-events.service', () => ({
  socketEventsService: mockSocketEventsService,
}));

vi.mock('../../services/channels.service', () => ({
  channelsService: mockChannelsService,
}));

vi.mock('../../services/evolution.service', () => ({
  evolutionService: mockEvolutionService,
}));

vi.mock('../../services/meta.service', () => ({
  metaService: mockMetaService,
}));

// Import after mocking
const { messagesRoutes } = await import('../../routes/messages');

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

describe('Messages Routes', () => {
  let app: Hono;

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono();
    app.route('/messages', messagesRoutes);
  });

  describe('GET /messages/conversation/:conversationId', () => {
    it('should return messages for a conversation', async () => {
      const mockMessages = [createMockMessage(), createMockMessage({ id: 'msg-2' })];
      mockConversationsService.findById.mockResolvedValue(createMockConversation());
      mockMessagesService.findByConversation.mockResolvedValue({
        messages: mockMessages,
        nextCursor: null,
        hasMore: false,
      });

      const res = await app.request('/messages/conversation/conversation-123', {
        method: 'GET',
        headers: authHeaders,
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.messages).toHaveLength(2);
      expect(mockConversationsService.findById).toHaveBeenCalledWith(
        'conversation-123',
        'test-tenant-id',
      );
    });

    it('should return 404 if conversation not found', async () => {
      mockConversationsService.findById.mockResolvedValue(null);

      const res = await app.request('/messages/conversation/nonexistent', {
        method: 'GET',
        headers: authHeaders,
      });

      expect(res.status).toBe(404);
    });

    it('should support pagination with cursor', async () => {
      mockConversationsService.findById.mockResolvedValue(createMockConversation());
      mockMessagesService.findByConversation.mockResolvedValue({
        messages: [createMockMessage()],
        nextCursor: '2024-01-01T00:00:00.000Z',
        hasMore: true,
      });

      const res = await app.request(
        '/messages/conversation/conversation-123?cursor=2024-01-01T00:00:00.000Z&limit=20',
        {
          method: 'GET',
          headers: authHeaders,
        },
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.hasMore).toBe(true);
      expect(data.nextCursor).toBe('2024-01-01T00:00:00.000Z');
    });
  });

  describe('POST /messages', () => {
    const validConversationId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

    it('should create a new text message', async () => {
      const mockMessage = createMockMessage();
      mockConversationsService.findById.mockResolvedValue(createMockConversation());
      mockChannelsService.findById.mockResolvedValue(createMockChannel());
      mockMessagesService.create.mockResolvedValue(mockMessage);
      mockMessagesService.update.mockResolvedValue(mockMessage);
      mockConversationsService.update.mockResolvedValue(createMockConversation());
      mockSocketEventsService.emitNewMessage.mockResolvedValue(undefined);

      const res = await app.request('/messages', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          conversationId: validConversationId,
          type: 'text',
          content: 'Hello, world!',
        }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.id).toBe('message-123');
      expect(mockMessagesService.create).toHaveBeenCalled();
      expect(mockSocketEventsService.emitNewMessage).toHaveBeenCalled();
    });

    it('should return 404 if conversation not found', async () => {
      mockConversationsService.findById.mockResolvedValue(null);

      const res = await app.request('/messages', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          conversationId: validConversationId,
          type: 'text',
          content: 'Hello',
        }),
      });

      expect(res.status).toBe(404);
    });

    it('should validate message type enum', async () => {
      const res = await app.request('/messages', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          conversationId: validConversationId,
          type: 'invalid-type',
          content: 'Hello',
        }),
      });

      expect(res.status).toBe(400);
    });

    it('should validate conversationId is UUID', async () => {
      const res = await app.request('/messages', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          conversationId: 'not-a-uuid',
          type: 'text',
          content: 'Hello',
        }),
      });

      expect(res.status).toBe(400);
    });

    it('should create image message with mediaUrl', async () => {
      const mockMessage = createMockMessage({
        type: 'image',
        mediaUrl: 'https://example.com/image.jpg',
      });
      mockConversationsService.findById.mockResolvedValue(createMockConversation());
      mockChannelsService.findById.mockResolvedValue(createMockChannel());
      mockMessagesService.create.mockResolvedValue(mockMessage);
      mockMessagesService.update.mockResolvedValue(mockMessage);
      mockConversationsService.update.mockResolvedValue(createMockConversation());
      mockSocketEventsService.emitNewMessage.mockResolvedValue(undefined);

      const res = await app.request('/messages', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          conversationId: validConversationId,
          type: 'image',
          mediaUrl: 'https://example.com/image.jpg',
        }),
      });

      expect(res.status).toBe(201);
    });
  });

  describe('GET /messages/:id', () => {
    it('should return a message by id', async () => {
      mockMessagesService.findById.mockResolvedValue(createMockMessage());

      const res = await app.request('/messages/message-123', {
        method: 'GET',
        headers: authHeaders,
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.id).toBe('message-123');
    });

    it('should return 404 if message not found', async () => {
      mockMessagesService.findById.mockResolvedValue(null);

      const res = await app.request('/messages/nonexistent', {
        method: 'GET',
        headers: authHeaders,
      });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /messages/:id', () => {
    it('should delete a message (soft delete)', async () => {
      mockMessagesService.delete.mockResolvedValue(createMockMessage());

      const res = await app.request('/messages/message-123', {
        method: 'DELETE',
        headers: authHeaders,
      });

      expect(res.status).toBe(200);
      expect(mockMessagesService.delete).toHaveBeenCalledWith('message-123', 'test-tenant-id');
    });

    it('should return 404 if message not found', async () => {
      mockMessagesService.delete.mockResolvedValue(null);

      const res = await app.request('/messages/nonexistent', {
        method: 'DELETE',
        headers: authHeaders,
      });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /messages/conversation/:conversationId/read', () => {
    it('should mark messages as read', async () => {
      mockConversationsService.findById.mockResolvedValue(createMockConversation());
      mockMessagesService.markAsRead.mockResolvedValue(undefined);

      const res = await app.request('/messages/conversation/conversation-123/read', {
        method: 'POST',
        headers: authHeaders,
      });

      expect(res.status).toBe(200);
      expect(mockMessagesService.markAsRead).toHaveBeenCalledWith(
        'conversation-123',
        'test-tenant-id',
      );
    });

    it('should return 404 if conversation not found', async () => {
      mockConversationsService.findById.mockResolvedValue(null);

      const res = await app.request('/messages/conversation/nonexistent/read', {
        method: 'POST',
        headers: authHeaders,
      });

      expect(res.status).toBe(404);
    });
  });

  describe('GET /messages/conversation/:conversationId/unread', () => {
    it('should return unread count', async () => {
      mockConversationsService.findById.mockResolvedValue(createMockConversation());
      mockMessagesService.getUnreadCount.mockResolvedValue(5);

      const res = await app.request('/messages/conversation/conversation-123/unread', {
        method: 'GET',
        headers: authHeaders,
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.unreadCount).toBe(5);
    });

    it('should return 404 if conversation not found', async () => {
      mockConversationsService.findById.mockResolvedValue(null);

      const res = await app.request('/messages/conversation/nonexistent/unread', {
        method: 'GET',
        headers: authHeaders,
      });

      expect(res.status).toBe(404);
    });
  });
});
