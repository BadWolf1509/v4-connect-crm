import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Redis before importing the service
const mockPublish = vi.fn().mockResolvedValue(1);

vi.mock('ioredis', () => ({
  Redis: vi.fn(() => ({
    publish: mockPublish,
  })),
}));

// Set REDIS_URL to enable Redis in the service
process.env.REDIS_URL = 'redis://localhost:6379';

// Import after mocking
const { socketEventsService } = await import('../../services/socket-events.service');

describe('Socket Events Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('emitNewMessage', () => {
    it('should publish new message event to Redis', async () => {
      const message = {
        id: 'msg-123',
        conversationId: 'conv-123',
        content: 'Hello',
        type: 'text',
      };

      await socketEventsService.emitNewMessage('conv-123', message);

      expect(mockPublish).toHaveBeenCalledWith(
        'socket:events',
        expect.stringContaining('"type":"message:new"'),
      );
      expect(mockPublish).toHaveBeenCalledWith(
        'socket:events',
        expect.stringContaining('"conversationId":"conv-123"'),
      );
    });
  });

  describe('emitMessageUpdate', () => {
    it('should publish message update event to Redis', async () => {
      const messageUpdate = {
        id: 'msg-123',
        status: 'delivered',
      };

      await socketEventsService.emitMessageUpdate('conv-123', messageUpdate);

      expect(mockPublish).toHaveBeenCalledWith(
        'socket:events',
        expect.stringContaining('"type":"message:update"'),
      );
    });
  });

  describe('emitNewConversation', () => {
    it('should publish new conversation event to Redis', async () => {
      const conversation = {
        id: 'conv-123',
        contactId: 'contact-123',
        status: 'open',
      };

      await socketEventsService.emitNewConversation('tenant-123', conversation);

      expect(mockPublish).toHaveBeenCalledWith(
        'socket:events',
        expect.stringContaining('"type":"conversation:new"'),
      );
      expect(mockPublish).toHaveBeenCalledWith(
        'socket:events',
        expect.stringContaining('"tenantId":"tenant-123"'),
      );
    });
  });

  describe('emitConversationUpdate', () => {
    it('should publish conversation update event to Redis', async () => {
      const conversationUpdate = {
        id: 'conv-123',
        status: 'resolved',
      };

      await socketEventsService.emitConversationUpdate('tenant-123', conversationUpdate);

      expect(mockPublish).toHaveBeenCalledWith(
        'socket:events',
        expect.stringContaining('"type":"conversation:update"'),
      );
    });
  });

  describe('emitNotification', () => {
    it('should publish notification event to Redis', async () => {
      const notification = {
        title: 'New message',
        body: 'You have a new message',
      };

      await socketEventsService.emitNotification('user-123', notification);

      expect(mockPublish).toHaveBeenCalledWith(
        'socket:events',
        expect.stringContaining('"type":"notification"'),
      );
      expect(mockPublish).toHaveBeenCalledWith(
        'socket:events',
        expect.stringContaining('"userId":"user-123"'),
      );
    });
  });
});
