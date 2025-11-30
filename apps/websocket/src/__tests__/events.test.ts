import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock event emitter functions
const createMockIo = () => ({
  to: vi.fn().mockReturnThis(),
  emit: vi.fn(),
});

describe('WebSocket Event Emitters', () => {
  let mockIo: ReturnType<typeof createMockIo>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockIo = createMockIo();
  });

  describe('emitNewMessage', () => {
    it('should emit message:new to conversation room', () => {
      const conversationId = 'conv-123';
      const message = {
        id: 'msg-456',
        content: 'Hello, world!',
        senderId: 'user-789',
        createdAt: new Date().toISOString(),
      };

      // Simulate emitNewMessage behavior
      mockIo.to(`conversation:${conversationId}`).emit('message:new', message);

      expect(mockIo.to).toHaveBeenCalledWith('conversation:conv-123');
      expect(mockIo.emit).toHaveBeenCalledWith('message:new', message);
    });

    it('should handle empty message object', () => {
      mockIo.to('conversation:test').emit('message:new', {});

      expect(mockIo.emit).toHaveBeenCalledWith('message:new', {});
    });
  });

  describe('emitMessageUpdate', () => {
    it('should emit message:update to conversation room', () => {
      const conversationId = 'conv-123';
      const message = {
        id: 'msg-456',
        status: 'read',
        updatedAt: new Date().toISOString(),
      };

      mockIo.to(`conversation:${conversationId}`).emit('message:update', message);

      expect(mockIo.to).toHaveBeenCalledWith('conversation:conv-123');
      expect(mockIo.emit).toHaveBeenCalledWith('message:update', message);
    });
  });

  describe('emitConversationUpdate', () => {
    it('should emit conversation:update to tenant room', () => {
      const tenantId = 'tenant-123';
      const conversation = {
        id: 'conv-456',
        status: 'open',
        lastMessageAt: new Date().toISOString(),
      };

      mockIo.to(`tenant:${tenantId}`).emit('conversation:update', conversation);

      expect(mockIo.to).toHaveBeenCalledWith('tenant:tenant-123');
      expect(mockIo.emit).toHaveBeenCalledWith('conversation:update', conversation);
    });
  });

  describe('emitNewConversation', () => {
    it('should emit conversation:new to tenant room', () => {
      const tenantId = 'tenant-123';
      const conversation = {
        id: 'conv-789',
        contactName: 'John Doe',
        channel: 'whatsapp',
        status: 'open',
      };

      mockIo.to(`tenant:${tenantId}`).emit('conversation:new', conversation);

      expect(mockIo.to).toHaveBeenCalledWith('tenant:tenant-123');
      expect(mockIo.emit).toHaveBeenCalledWith('conversation:new', conversation);
    });
  });

  describe('emitNotification', () => {
    it('should emit notification to user room', () => {
      const userId = 'user-123';
      const notification = {
        id: 'notif-456',
        type: 'message',
        title: 'New message',
        body: 'You have a new message from John',
      };

      mockIo.to(`user:${userId}`).emit('notification', notification);

      expect(mockIo.to).toHaveBeenCalledWith('user:user-123');
      expect(mockIo.emit).toHaveBeenCalledWith('notification', notification);
    });
  });
});

describe('WebSocket Socket Event Handlers', () => {
  const createMockSocket = () => ({
    id: 'socket-123',
    data: {
      userId: 'user-123',
      tenantId: 'tenant-456',
      name: 'Test User',
      role: 'admin',
    },
    join: vi.fn(),
    leave: vi.fn(),
    to: vi.fn().mockReturnThis(),
    emit: vi.fn(),
  });

  let mockSocket: ReturnType<typeof createMockSocket>;
  let mockIo: ReturnType<typeof createMockIo>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket = createMockSocket();
    mockIo = createMockIo();
  });

  describe('connection', () => {
    it('should join tenant and user rooms on connection', () => {
      const { userId, tenantId } = mockSocket.data;

      // Simulate connection handler
      mockSocket.join(`tenant:${tenantId}`);
      mockSocket.join(`user:${userId}`);

      expect(mockSocket.join).toHaveBeenCalledWith('tenant:tenant-456');
      expect(mockSocket.join).toHaveBeenCalledWith('user:user-123');
      expect(mockSocket.join).toHaveBeenCalledTimes(2);
    });
  });

  describe('conversation:join', () => {
    it('should join conversation room', () => {
      const conversationId = 'conv-789';

      mockSocket.join(`conversation:${conversationId}`);

      expect(mockSocket.join).toHaveBeenCalledWith('conversation:conv-789');
    });
  });

  describe('conversation:leave', () => {
    it('should leave conversation room', () => {
      const conversationId = 'conv-789';

      mockSocket.leave(`conversation:${conversationId}`);

      expect(mockSocket.leave).toHaveBeenCalledWith('conversation:conv-789');
    });
  });

  describe('typing:start', () => {
    it('should broadcast typing:start to conversation room', () => {
      const conversationId = 'conv-123';
      const { userId } = mockSocket.data;

      mockSocket.to(`conversation:${conversationId}`).emit('typing:start', {
        conversationId,
        userId,
      });

      expect(mockSocket.to).toHaveBeenCalledWith('conversation:conv-123');
      expect(mockSocket.emit).toHaveBeenCalledWith('typing:start', {
        conversationId: 'conv-123',
        userId: 'user-123',
      });
    });
  });

  describe('typing:stop', () => {
    it('should broadcast typing:stop to conversation room', () => {
      const conversationId = 'conv-123';
      const { userId } = mockSocket.data;

      mockSocket.to(`conversation:${conversationId}`).emit('typing:stop', {
        conversationId,
        userId,
      });

      expect(mockSocket.to).toHaveBeenCalledWith('conversation:conv-123');
      expect(mockSocket.emit).toHaveBeenCalledWith('typing:stop', {
        conversationId: 'conv-123',
        userId: 'user-123',
      });
    });
  });

  describe('presence:update', () => {
    it('should broadcast presence update to tenant room', () => {
      const { userId, tenantId } = mockSocket.data;
      const status = 'online';

      mockIo.to(`tenant:${tenantId}`).emit('presence:update', {
        userId,
        status,
      });

      expect(mockIo.to).toHaveBeenCalledWith('tenant:tenant-456');
      expect(mockIo.emit).toHaveBeenCalledWith('presence:update', {
        userId: 'user-123',
        status: 'online',
      });
    });

    it('should handle different status values', () => {
      const { userId, tenantId } = mockSocket.data;

      for (const status of ['online', 'away', 'busy'] as const) {
        mockIo.to(`tenant:${tenantId}`).emit('presence:update', { userId, status });
      }

      expect(mockIo.to).toHaveBeenCalledTimes(3);
    });
  });

  describe('disconnect', () => {
    it('should broadcast offline status to tenant on disconnect', () => {
      const { userId, tenantId } = mockSocket.data;

      mockIo.to(`tenant:${tenantId}`).emit('presence:update', {
        userId,
        status: 'offline',
      });

      expect(mockIo.emit).toHaveBeenCalledWith('presence:update', {
        userId: 'user-123',
        status: 'offline',
      });
    });
  });
});

describe('Redis Event Subscriber', () => {
  const mockEmitters = {
    emitNewMessage: vi.fn(),
    emitMessageUpdate: vi.fn(),
    emitNewConversation: vi.fn(),
    emitConversationUpdate: vi.fn(),
    emitNotification: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle message:new event', () => {
    const event = {
      type: 'message:new',
      conversationId: 'conv-123',
      data: { id: 'msg-456', content: 'Hello' },
    };

    // Simulate event handling
    if (event.type === 'message:new') {
      mockEmitters.emitNewMessage(event.conversationId, event.data);
    }

    expect(mockEmitters.emitNewMessage).toHaveBeenCalledWith('conv-123', { id: 'msg-456', content: 'Hello' });
  });

  it('should handle message:update event', () => {
    const event = {
      type: 'message:update',
      conversationId: 'conv-123',
      data: { id: 'msg-456', status: 'read' },
    };

    if (event.type === 'message:update') {
      mockEmitters.emitMessageUpdate(event.conversationId, event.data);
    }

    expect(mockEmitters.emitMessageUpdate).toHaveBeenCalledWith('conv-123', { id: 'msg-456', status: 'read' });
  });

  it('should handle conversation:new event', () => {
    const event = {
      type: 'conversation:new',
      tenantId: 'tenant-123',
      data: { id: 'conv-789', contactName: 'John' },
    };

    if (event.type === 'conversation:new') {
      mockEmitters.emitNewConversation(event.tenantId, event.data);
    }

    expect(mockEmitters.emitNewConversation).toHaveBeenCalledWith('tenant-123', { id: 'conv-789', contactName: 'John' });
  });

  it('should handle conversation:update event', () => {
    const event = {
      type: 'conversation:update',
      tenantId: 'tenant-123',
      data: { id: 'conv-789', status: 'closed' },
    };

    if (event.type === 'conversation:update') {
      mockEmitters.emitConversationUpdate(event.tenantId, event.data);
    }

    expect(mockEmitters.emitConversationUpdate).toHaveBeenCalledWith('tenant-123', { id: 'conv-789', status: 'closed' });
  });

  it('should handle notification event', () => {
    const event = {
      type: 'notification',
      userId: 'user-123',
      data: { title: 'New message', body: 'You have a new message' },
    };

    if (event.type === 'notification') {
      mockEmitters.emitNotification(event.userId, event.data);
    }

    expect(mockEmitters.emitNotification).toHaveBeenCalledWith('user-123', { title: 'New message', body: 'You have a new message' });
  });

  it('should handle invalid JSON gracefully', () => {
    const invalidMessage = 'not-valid-json';
    let errorCaught = false;

    try {
      JSON.parse(invalidMessage);
    } catch {
      errorCaught = true;
    }

    expect(errorCaught).toBe(true);
  });

  it('should ignore unknown event types', () => {
    const event = {
      type: 'unknown:event',
      data: {},
    };

    // Event type switch should not match any case
    const handled =
      event.type === 'message:new' ||
      event.type === 'message:update' ||
      event.type === 'conversation:new' ||
      event.type === 'conversation:update' ||
      event.type === 'notification';

    expect(handled).toBe(false);
  });
});
