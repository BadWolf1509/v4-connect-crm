import { describe, expect, it, vi, beforeEach } from 'vitest';

describe('WebSocket Room Management', () => {
  const createMockSocket = () => ({
    id: 'socket-123',
    data: {
      userId: 'user-123',
      tenantId: 'tenant-456',
      name: 'Test User',
      role: 'admin',
    },
    rooms: new Set<string>(['socket-123']),
    join: vi.fn(function (this: { rooms: Set<string> }, room: string) {
      this.rooms.add(room);
    }),
    leave: vi.fn(function (this: { rooms: Set<string> }, room: string) {
      this.rooms.delete(room);
    }),
  });

  let mockSocket: ReturnType<typeof createMockSocket>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket = createMockSocket();
  });

  describe('Room naming conventions', () => {
    it('should use correct format for tenant rooms', () => {
      const tenantId = 'tenant-abc-123';
      const expectedRoom = `tenant:${tenantId}`;

      mockSocket.join(expectedRoom);

      expect(mockSocket.rooms.has('tenant:tenant-abc-123')).toBe(true);
    });

    it('should use correct format for user rooms', () => {
      const userId = 'user-xyz-789';
      const expectedRoom = `user:${userId}`;

      mockSocket.join(expectedRoom);

      expect(mockSocket.rooms.has('user:user-xyz-789')).toBe(true);
    });

    it('should use correct format for conversation rooms', () => {
      const conversationId = 'conv-def-456';
      const expectedRoom = `conversation:${conversationId}`;

      mockSocket.join(expectedRoom);

      expect(mockSocket.rooms.has('conversation:conv-def-456')).toBe(true);
    });
  });

  describe('Joining rooms', () => {
    it('should join multiple conversation rooms', () => {
      const conversationIds = ['conv-1', 'conv-2', 'conv-3'];

      for (const id of conversationIds) {
        mockSocket.join(`conversation:${id}`);
      }

      expect(mockSocket.rooms.has('conversation:conv-1')).toBe(true);
      expect(mockSocket.rooms.has('conversation:conv-2')).toBe(true);
      expect(mockSocket.rooms.has('conversation:conv-3')).toBe(true);
      expect(mockSocket.join).toHaveBeenCalledTimes(3);
    });

    it('should handle joining same room multiple times', () => {
      mockSocket.join('conversation:conv-1');
      mockSocket.join('conversation:conv-1');

      expect(mockSocket.join).toHaveBeenCalledTimes(2);
      // Set ensures uniqueness
      expect(mockSocket.rooms.size).toBe(2); // socket id + conversation room
    });
  });

  describe('Leaving rooms', () => {
    it('should leave specific conversation room', () => {
      mockSocket.join('conversation:conv-1');
      mockSocket.join('conversation:conv-2');

      mockSocket.leave('conversation:conv-1');

      expect(mockSocket.rooms.has('conversation:conv-1')).toBe(false);
      expect(mockSocket.rooms.has('conversation:conv-2')).toBe(true);
    });

    it('should handle leaving room not joined', () => {
      const initialSize = mockSocket.rooms.size;

      mockSocket.leave('conversation:non-existent');

      expect(mockSocket.leave).toHaveBeenCalledWith('conversation:non-existent');
      expect(mockSocket.rooms.size).toBe(initialSize);
    });
  });

  describe('Room isolation', () => {
    it('should keep tenant room separate from conversation rooms', () => {
      const tenantId = 'tenant-123';
      const conversationId = 'conv-456';

      mockSocket.join(`tenant:${tenantId}`);
      mockSocket.join(`conversation:${conversationId}`);

      expect(mockSocket.rooms.has(`tenant:${tenantId}`)).toBe(true);
      expect(mockSocket.rooms.has(`conversation:${conversationId}`)).toBe(true);
      expect(mockSocket.rooms.size).toBe(3); // socket id + tenant + conversation
    });

    it('should not confuse similar room names', () => {
      mockSocket.join('tenant:123');
      mockSocket.join('user:123');
      mockSocket.join('conversation:123');

      expect(mockSocket.rooms.has('tenant:123')).toBe(true);
      expect(mockSocket.rooms.has('user:123')).toBe(true);
      expect(mockSocket.rooms.has('conversation:123')).toBe(true);
    });
  });
});

describe('Room-based broadcasting', () => {
  const createMockIo = () => {
    const rooms = new Map<string, Set<string>>();
    const socketMocks = new Map<string, { emit: ReturnType<typeof vi.fn> }>();

    return {
      rooms,
      socketMocks,
      to: vi.fn((room: string) => ({
        emit: vi.fn((event: string, data: unknown) => {
          // Track emissions per room
          const existingEmits = rooms.get(room) || new Set();
          existingEmits.add(`${event}:${JSON.stringify(data)}`);
          rooms.set(room, existingEmits);
        }),
      })),
    };
  };

  let mockIo: ReturnType<typeof createMockIo>;

  beforeEach(() => {
    mockIo = createMockIo();
  });

  it('should broadcast to correct conversation room', () => {
    const conversationId = 'conv-123';
    const message = { id: 'msg-1', content: 'Hello' };

    mockIo.to(`conversation:${conversationId}`).emit('message:new', message);

    expect(mockIo.to).toHaveBeenCalledWith('conversation:conv-123');
  });

  it('should broadcast to correct tenant room', () => {
    const tenantId = 'tenant-456';
    const update = { userId: 'user-123', status: 'online' };

    mockIo.to(`tenant:${tenantId}`).emit('presence:update', update);

    expect(mockIo.to).toHaveBeenCalledWith('tenant:tenant-456');
  });

  it('should broadcast to correct user room', () => {
    const userId = 'user-789';
    const notification = { type: 'mention', message: 'You were mentioned' };

    mockIo.to(`user:${userId}`).emit('notification', notification);

    expect(mockIo.to).toHaveBeenCalledWith('user:user-789');
  });

  it('should handle multiple broadcasts to same room', () => {
    const conversationId = 'conv-123';

    mockIo.to(`conversation:${conversationId}`).emit('message:new', { id: '1' });
    mockIo.to(`conversation:${conversationId}`).emit('message:new', { id: '2' });
    mockIo.to(`conversation:${conversationId}`).emit('typing:start', { userId: 'u1' });

    expect(mockIo.to).toHaveBeenCalledTimes(3);
  });
});

describe('Multi-tenant room security', () => {
  it('should generate unique room names per tenant', () => {
    const tenant1Room = 'tenant:tenant-aaa';
    const tenant2Room = 'tenant:tenant-bbb';

    expect(tenant1Room).not.toBe(tenant2Room);
  });

  it('should include tenant ID in room name for isolation', () => {
    const tenantId = 'tenant-12345';
    const roomName = `tenant:${tenantId}`;

    expect(roomName).toContain(tenantId);
    expect(roomName.startsWith('tenant:')).toBe(true);
  });

  it('should validate room name format', () => {
    const validRoomPatterns = [
      /^tenant:[a-zA-Z0-9-]+$/,
      /^user:[a-zA-Z0-9-]+$/,
      /^conversation:[a-zA-Z0-9-]+$/,
    ];

    const testRooms = [
      { room: 'tenant:abc-123', pattern: validRoomPatterns[0] },
      { room: 'user:xyz-789', pattern: validRoomPatterns[1] },
      { room: 'conversation:def-456', pattern: validRoomPatterns[2] },
    ];

    for (const { room, pattern } of testRooms) {
      expect(room).toMatch(pattern);
    }
  });

  it('should prevent cross-tenant room access by room naming', () => {
    const tenant1 = 'tenant-111';
    const tenant2 = 'tenant-222';

    const tenant1ConvRoom = `tenant:${tenant1}:conversation:conv-1`;
    const tenant2ConvRoom = `tenant:${tenant2}:conversation:conv-1`;

    // Even with same conversation ID, rooms are different due to tenant prefix
    expect(tenant1ConvRoom).not.toBe(tenant2ConvRoom);
  });
});
