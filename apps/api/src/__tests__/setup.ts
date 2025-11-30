import { vi } from 'vitest';

// Mock environment variables
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.AUTH_SECRET = 'test-secret-key-for-testing-purposes-only';
process.env.EVOLUTION_API_URL = 'http://localhost:8080';
process.env.EVOLUTION_API_KEY = 'test-api-key';

// Mock Redis
vi.mock('ioredis', () => {
  const mockRedis = {
    publish: vi.fn().mockResolvedValue(1),
    subscribe: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    duplicate: vi.fn().mockReturnThis(),
  };
  return {
    Redis: vi.fn(() => mockRedis),
    default: vi.fn(() => mockRedis),
  };
});

// Global test utilities
export const createMockAuth = (overrides = {}) => ({
  userId: 'test-user-id',
  tenantId: 'test-tenant-id',
  email: 'test@example.com',
  role: 'admin',
  ...overrides,
});

export const createMockContext = (auth = createMockAuth()) => ({
  get: vi.fn((key: string) => {
    if (key === 'auth') return auth;
    return undefined;
  }),
  json: vi.fn((data, status = 200) => ({ data, status })),
  req: {
    param: vi.fn(),
    query: vi.fn(() => ({})),
    valid: vi.fn(),
    json: vi.fn(),
    parseBody: vi.fn(),
  },
});
