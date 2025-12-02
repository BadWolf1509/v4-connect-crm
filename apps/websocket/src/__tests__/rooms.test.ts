import { beforeEach, describe, expect, it, vi } from 'vitest';

const loadModule = async () => {
  return import('../index');
};

type HandlerMap = Map<string, (...args: any[]) => void>;

const createSocket = () => {
  const handlers: HandlerMap = new Map();

  return {
    data: {
      userId: 'user-123',
      tenantId: 'tenant-456',
      name: 'Test User',
    },
    join: vi.fn(),
    leave: vi.fn(),
    to: vi.fn(function (this: any) {
      return this;
    }),
    emit: vi.fn(),
    on: vi.fn((event: string, cb: (...args: any[]) => void) => {
      handlers.set(event, cb);
    }),
    handlers,
  };
};

describe('WebSocket connection handling', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv('AUTH_SECRET', 'test-secret-key-32-characters-long');
    vi.stubEnv('REDIS_URL', '');
  });

  it('joins base rooms and wires conversation listeners', async () => {
    const { io } = await loadModule();
    const connectionHandler = vi.mocked(io.on).mock.calls.find(([event]) => event === 'connection')?.[1];
    expect(connectionHandler).toBeDefined();

    const socket = createSocket();
    (connectionHandler as (socket: any) => void)(socket);

    expect(socket.join).toHaveBeenCalledWith('tenant:tenant-456');
    expect(socket.join).toHaveBeenCalledWith('user:user-123');

    socket.handlers.get('conversation:join')?.('conv-1');
    socket.handlers.get('conversation:leave')?.('conv-1');

    expect(socket.join).toHaveBeenCalledWith('conversation:conv-1');
    expect(socket.leave).toHaveBeenCalledWith('conversation:conv-1');
  });

  it('broadcasts typing and presence events', async () => {
    const { io } = await loadModule();
    const connectionHandler = vi.mocked(io.on).mock.calls.find(([event]) => event === 'connection')?.[1];
    const socket = createSocket();

    (connectionHandler as (socket: any) => void)(socket);

    socket.handlers.get('typing:start')?.({ conversationId: 'conv-1' });
    socket.handlers.get('typing:stop')?.({ conversationId: 'conv-1' });
    socket.handlers.get('presence:update')?.('online');
    socket.handlers.get('disconnect')?.('server-disconnect');

    expect(socket.to).toHaveBeenCalledWith('conversation:conv-1');
    expect(io.to).toHaveBeenCalledWith('tenant:tenant-456');
  });
});
