import { vi } from 'vitest';

// Mock environment variables
vi.stubEnv('AUTH_SECRET', 'test-secret-key-32-characters-long');
vi.stubEnv('REDIS_URL', '');
vi.stubEnv('PORT', '3003');

// Mock ioredis
vi.mock('ioredis', () => {
  const RedisMock = vi.fn().mockImplementation(() => ({
    duplicate: vi.fn().mockReturnThis(),
    subscribe: vi.fn(),
    on: vi.fn(),
    quit: vi.fn(),
  }));
  return { Redis: RedisMock, default: RedisMock };
});

// Mock socket.io
vi.mock('socket.io', () => {
  const mockSocket = {
    id: 'socket-123',
    data: {},
    handshake: {
      auth: { token: '' },
    },
    join: vi.fn(),
    leave: vi.fn(),
    to: vi.fn().mockReturnThis(),
    emit: vi.fn(),
    on: vi.fn(),
  };

  const mockIo = {
    adapter: vi.fn(),
    use: vi.fn(),
    on: vi.fn(),
    to: vi.fn().mockReturnThis(),
    emit: vi.fn(),
  };

  return {
    Server: vi.fn().mockReturnValue(mockIo),
  };
});

// Mock @socket.io/redis-adapter
vi.mock('@socket.io/redis-adapter', () => ({
  createAdapter: vi.fn(),
}));

// Mock jose
vi.mock('jose', () => ({
  jwtDecrypt: vi.fn(),
}));

// Mock node:http
vi.mock('node:http', () => ({
  createServer: vi.fn().mockReturnValue({
    listen: vi.fn((port, cb) => cb?.()),
  }),
}));
