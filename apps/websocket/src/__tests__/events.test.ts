import { beforeEach, describe, expect, it, vi } from 'vitest';

const loadModule = async () => {
  return import('../index');
};

describe('WebSocket event emitters', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv('AUTH_SECRET', 'test-secret-key-32-characters-long');
    vi.stubEnv('REDIS_URL', '');
  });

  it('emits conversation and message events to correct rooms', async () => {
    const { emitNewMessage, emitMessageUpdate, emitConversationUpdate, emitNewConversation, io } =
      await loadModule();

    emitNewMessage('conv-123', { id: 'msg-1' });
    emitMessageUpdate('conv-123', { id: 'msg-1', status: 'read' });
    emitConversationUpdate('tenant-abc', { id: 'conv-2', status: 'open' });
    emitNewConversation('tenant-abc', { id: 'conv-3' });

    expect(io.to).toHaveBeenCalledWith('conversation:conv-123');
    expect(io.to).toHaveBeenCalledWith('tenant:tenant-abc');

    const firstRoom = vi.mocked(io.to).mock.results[0]!.value as { emit: ReturnType<typeof vi.fn> };
    expect(firstRoom.emit).toHaveBeenCalledWith('message:new', { id: 'msg-1' });
  });

  it('emits user notifications', async () => {
    const { emitNotification, io } = await loadModule();
    emitNotification('user-123', { title: 'Test' });

    expect(io.to).toHaveBeenCalledWith('user:user-123');
    const target = vi.mocked(io.to).mock.results[0]!.value as { emit: ReturnType<typeof vi.fn> };
    expect(target.emit).toHaveBeenCalledWith('notification', { title: 'Test' });
  });
});

describe('Redis event subscriber', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv('AUTH_SECRET', 'test-secret-key-32-characters-long');
    vi.stubEnv('REDIS_URL', 'redis://localhost:6379');
  });

  it('routes published socket events to emitters', async () => {
    const { io } = await loadModule();
    const { Redis } = await import('ioredis');
    const redisInstance = vi.mocked(Redis).mock.results.at(-1)!.value as {
      on: ReturnType<typeof vi.fn>;
    };

    const messageHandler = redisInstance.on.mock.calls.find(([event]) => event === 'message')?.[1];
    expect(messageHandler).toBeDefined();

    (messageHandler as (channel: string, message: string) => void)(
      'socket:events',
      JSON.stringify({
        type: 'message:update',
        conversationId: 'conv-9',
        data: { id: 'm-1' },
      }),
    );

    const lastCall = vi.mocked(io.to).mock.calls.at(-1);
    expect(lastCall?.[0]).toBe('conversation:conv-9');
  });
});
