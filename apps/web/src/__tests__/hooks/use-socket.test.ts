import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock socket.io-client
const mockSocket = {
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  disconnect: vi.fn(),
  connected: false,
  id: 'test-socket-id',
};

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
}));

// Mock next-auth/react
const mockSession = {
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    role: 'admin',
    tenantId: 'test-tenant-id',
  },
  expires: new Date(Date.now() + 3600000).toISOString(),
};

vi.mock('next-auth/react', () => ({
  useSession: vi.fn(() => ({
    data: mockSession,
    status: 'authenticated',
  })),
}));

// Import after mocking
import { io } from 'socket.io-client';
import { useSocket } from '@/hooks/use-socket';

describe('useSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket.connected = false;
    mockSocket.on.mockReset();
    mockSocket.off.mockReset();
    mockSocket.emit.mockReset();
    mockSocket.disconnect.mockReset();
  });

  describe('initialization', () => {
    it('should create socket connection with session token', () => {
      renderHook(() => useSocket());

      expect(io).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          auth: {
            token: JSON.stringify(mockSession),
          },
          transports: ['websocket', 'polling'],
          reconnection: true,
        }),
      );
    });

    it('should not create socket when no session', async () => {
      const useSession = await import('next-auth/react');
      vi.mocked(useSession.useSession).mockReturnValueOnce({
        data: null,
        status: 'unauthenticated',
        update: vi.fn(),
      });

      vi.mocked(io).mockClear();

      renderHook(() => useSocket());

      expect(io).not.toHaveBeenCalled();
    });

    it('should register event handlers', () => {
      renderHook(() => useSocket());

      expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('connect_error', expect.any(Function));
    });
  });

  describe('event callbacks', () => {
    it('should call onConnect when socket connects', () => {
      const onConnect = vi.fn();
      renderHook(() => useSocket({ onConnect }));

      // Simulate connect event
      const connectHandler = mockSocket.on.mock.calls.find(
        (call) => call[0] === 'connect',
      )?.[1];
      connectHandler?.();

      expect(onConnect).toHaveBeenCalled();
    });

    it('should call onDisconnect when socket disconnects', () => {
      const onDisconnect = vi.fn();
      renderHook(() => useSocket({ onDisconnect }));

      const disconnectHandler = mockSocket.on.mock.calls.find(
        (call) => call[0] === 'disconnect',
      )?.[1];
      disconnectHandler?.('io server disconnect');

      expect(onDisconnect).toHaveBeenCalledWith('io server disconnect');
    });

    it('should call onError when connection error occurs', () => {
      const onError = vi.fn();
      renderHook(() => useSocket({ onError }));

      const errorHandler = mockSocket.on.mock.calls.find(
        (call) => call[0] === 'connect_error',
      )?.[1];
      const error = new Error('Connection failed');
      errorHandler?.(error);

      expect(onError).toHaveBeenCalledWith(error);
    });
  });

  describe('conversation room methods', () => {
    it('should emit conversation:join event', () => {
      const { result } = renderHook(() => useSocket());

      act(() => {
        result.current.joinConversation('conv-123');
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('conversation:join', 'conv-123');
    });

    it('should emit conversation:leave event', () => {
      const { result } = renderHook(() => useSocket());

      act(() => {
        result.current.leaveConversation('conv-123');
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('conversation:leave', 'conv-123');
    });
  });

  describe('typing indicator methods', () => {
    it('should emit typing:start event', () => {
      const { result } = renderHook(() => useSocket());

      act(() => {
        result.current.startTyping('conv-123');
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('typing:start', {
        conversationId: 'conv-123',
      });
    });

    it('should emit typing:stop event', () => {
      const { result } = renderHook(() => useSocket());

      act(() => {
        result.current.stopTyping('conv-123');
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('typing:stop', {
        conversationId: 'conv-123',
      });
    });
  });

  describe('presence methods', () => {
    it('should emit presence:update event', () => {
      const { result } = renderHook(() => useSocket());

      act(() => {
        result.current.updatePresence('online');
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('presence:update', 'online');
    });

    it('should support different presence statuses', () => {
      const { result } = renderHook(() => useSocket());

      act(() => {
        result.current.updatePresence('away');
      });
      expect(mockSocket.emit).toHaveBeenCalledWith('presence:update', 'away');

      act(() => {
        result.current.updatePresence('busy');
      });
      expect(mockSocket.emit).toHaveBeenCalledWith('presence:update', 'busy');
    });
  });

  describe('generic event methods', () => {
    it('should subscribe to custom events with on()', () => {
      const { result } = renderHook(() => useSocket());
      const callback = vi.fn();

      act(() => {
        result.current.on('custom:event', callback);
      });

      expect(mockSocket.on).toHaveBeenCalledWith('custom:event', callback);
    });

    it('should return unsubscribe function from on()', () => {
      const { result } = renderHook(() => useSocket());
      const callback = vi.fn();

      let unsubscribe: () => void;
      act(() => {
        unsubscribe = result.current.on('custom:event', callback);
      });

      act(() => {
        unsubscribe();
      });

      expect(mockSocket.off).toHaveBeenCalledWith('custom:event', callback);
    });

    it('should emit custom events with emit()', () => {
      const { result } = renderHook(() => useSocket());

      act(() => {
        result.current.emit('custom:event', { data: 'test' });
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('custom:event', { data: 'test' });
    });
  });

  describe('cleanup', () => {
    it('should disconnect socket on unmount', () => {
      const { unmount } = renderHook(() => useSocket());

      unmount();

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });
  });

  describe('connection state', () => {
    it('should return isConnected false when socket not connected', () => {
      mockSocket.connected = false;
      const { result } = renderHook(() => useSocket());

      expect(result.current.isConnected).toBe(false);
    });

    it('should return socket reference', () => {
      const { result } = renderHook(() => useSocket());

      // Socket is returned from the ref
      expect(result.current.socket).toBeDefined();
    });
  });
});
