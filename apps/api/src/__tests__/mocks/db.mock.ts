import { vi } from 'vitest';

// Mock data generators
export const createMockChannel = (overrides = {}) => ({
  id: 'channel-123',
  tenantId: 'tenant-123',
  type: 'whatsapp' as const,
  provider: 'evolution' as const,
  name: 'WhatsApp Principal',
  phoneNumber: '+5511999999999',
  config: { instanceName: 'test-instance' },
  isActive: true,
  connectedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockMessage = (overrides = {}) => ({
  id: 'message-123',
  conversationId: 'conversation-123',
  tenantId: 'tenant-123',
  senderId: 'user-123',
  senderType: 'user' as const,
  type: 'text' as const,
  content: 'Hello, world!',
  mediaUrl: null,
  mediaType: null,
  status: 'sent' as const,
  metadata: {},
  externalId: null,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockConversation = (overrides = {}) => ({
  id: 'conversation-123',
  tenantId: 'tenant-123',
  channelId: 'channel-123',
  contactId: 'contact-123',
  inboxId: 'inbox-123',
  assigneeId: null,
  status: 'open' as const,
  priority: 'medium' as const,
  lastMessageAt: new Date(),
  metadata: {},
  createdAt: new Date(),
  updatedAt: new Date(),
  closedAt: null,
  ...overrides,
});

export const createMockContact = (overrides = {}) => ({
  id: 'contact-123',
  tenantId: 'tenant-123',
  name: 'John Doe',
  email: 'john@example.com',
  phone: '+5511999999999',
  avatarUrl: null,
  tags: [],
  customFields: {},
  externalId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// Chainable mock builder for Drizzle queries
export const createMockQueryBuilder = (returnValue: unknown = []) => {
  const mockBuilder = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue(Array.isArray(returnValue) ? returnValue : [returnValue]),
    then: vi.fn((resolve) => resolve(Array.isArray(returnValue) ? returnValue : [returnValue])),
  };

  // Allow chained methods to be awaited
  Object.defineProperty(mockBuilder, Symbol.toStringTag, { value: 'Promise' });

  return mockBuilder;
};

// Mock db instance
export const createMockDb = () => ({
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  query: {},
});
