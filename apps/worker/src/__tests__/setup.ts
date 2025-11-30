import { vi } from 'vitest';

// Mock environment variables
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.EVOLUTION_API_URL = 'http://localhost:8080';
process.env.EVOLUTION_API_KEY = 'test-api-key';
process.env.OPENAI_API_KEY = 'test-openai-key';

// Mock Redis
vi.mock('ioredis', () => {
  const mockRedis = {
    publish: vi.fn().mockResolvedValue(1),
    subscribe: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    duplicate: vi.fn().mockReturnThis(),
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    quit: vi.fn().mockResolvedValue(undefined),
  };
  return {
    Redis: vi.fn(() => mockRedis),
    default: vi.fn(() => mockRedis),
  };
});

// Mock BullMQ
vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation(() => ({
    add: vi.fn().mockResolvedValue({ id: 'job-1' }),
    close: vi.fn().mockResolvedValue(undefined),
  })),
  Worker: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
  })),
}));

// Mock database
vi.mock('@v4-connect/database', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  channels: {},
  contacts: {},
  conversations: {},
  messages: {},
  tenants: {},
  users: {},
}));

// Global fetch mock
global.fetch = vi.fn();
