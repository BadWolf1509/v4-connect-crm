import { vi } from 'vitest';
import {
  createMockChannel,
  createMockContact,
  createMockConversation,
  createMockMessage,
} from './db.mock';

// Channels Service Mock
export const mockChannelsService = {
  findAll: vi.fn().mockResolvedValue({ channels: [createMockChannel()] }),
  findById: vi.fn().mockResolvedValue(createMockChannel()),
  findByPhoneNumber: vi.fn().mockResolvedValue(createMockChannel()),
  create: vi.fn().mockResolvedValue(createMockChannel()),
  update: vi.fn().mockResolvedValue(createMockChannel()),
  delete: vi.fn().mockResolvedValue(createMockChannel()),
  connect: vi.fn().mockResolvedValue(createMockChannel({ isActive: true })),
  disconnect: vi.fn().mockResolvedValue(createMockChannel({ isActive: false })),
};

// Messages Service Mock
export const mockMessagesService = {
  findByConversation: vi.fn().mockResolvedValue({
    messages: [createMockMessage()],
    nextCursor: null,
    hasMore: false,
  }),
  findById: vi.fn().mockResolvedValue(createMockMessage()),
  findByExternalId: vi.fn().mockResolvedValue(createMockMessage()),
  create: vi.fn().mockResolvedValue(createMockMessage()),
  update: vi.fn().mockResolvedValue(createMockMessage()),
  updateStatus: vi.fn().mockResolvedValue(createMockMessage()),
  updateByExternalId: vi.fn().mockResolvedValue(createMockMessage()),
  delete: vi.fn().mockResolvedValue(createMockMessage()),
  getUnreadCount: vi.fn().mockResolvedValue(5),
  markAsRead: vi.fn().mockResolvedValue(undefined),
};

// Conversations Service Mock
export const mockConversationsService = {
  findAll: vi.fn().mockResolvedValue({
    conversations: [createMockConversation()],
    total: 1,
    page: 1,
    limit: 20,
  }),
  findById: vi.fn().mockResolvedValue(createMockConversation()),
  create: vi.fn().mockResolvedValue(createMockConversation()),
  update: vi.fn().mockResolvedValue(createMockConversation()),
  updateStatus: vi.fn().mockResolvedValue(createMockConversation()),
  assign: vi.fn().mockResolvedValue(createMockConversation()),
  close: vi.fn().mockResolvedValue(createMockConversation()),
  reopen: vi.fn().mockResolvedValue(createMockConversation()),
};

// Contacts Service Mock
export const mockContactsService = {
  findAll: vi.fn().mockResolvedValue({
    contacts: [createMockContact()],
    total: 1,
    page: 1,
    limit: 20,
  }),
  findById: vi.fn().mockResolvedValue(createMockContact()),
  findByPhone: vi.fn().mockResolvedValue(createMockContact()),
  findByEmail: vi.fn().mockResolvedValue(createMockContact()),
  create: vi.fn().mockResolvedValue(createMockContact()),
  update: vi.fn().mockResolvedValue(createMockContact()),
  delete: vi.fn().mockResolvedValue(createMockContact()),
  addTag: vi.fn().mockResolvedValue(createMockContact({ tags: ['new-tag'] })),
  removeTag: vi.fn().mockResolvedValue(createMockContact({ tags: [] })),
};

// Evolution Service Mock
export const mockEvolutionService = {
  createInstance: vi
    .fn()
    .mockResolvedValue({ success: true, data: { instance: { instanceName: 'test' } } }),
  deleteInstance: vi.fn().mockResolvedValue({ success: true }),
  connectInstance: vi.fn().mockResolvedValue({ success: true, data: { base64: 'qr-code-data' } }),
  getInstanceState: vi
    .fn()
    .mockResolvedValue({ success: true, data: { instance: { state: 'open' } } }),
  logoutInstance: vi.fn().mockResolvedValue({ success: true }),
  setWebhook: vi.fn().mockResolvedValue({ success: true }),
  sendText: vi.fn().mockResolvedValue({ success: true, data: { key: { id: 'msg-123' } } }),
  sendImage: vi.fn().mockResolvedValue({ success: true, data: { key: { id: 'msg-123' } } }),
  sendAudio: vi.fn().mockResolvedValue({ success: true, data: { key: { id: 'msg-123' } } }),
  sendDocument: vi.fn().mockResolvedValue({ success: true, data: { key: { id: 'msg-123' } } }),
  checkNumber: vi
    .fn()
    .mockResolvedValue({
      success: true,
      data: [{ exists: true, jid: '5511999999999@s.whatsapp.net' }],
    }),
};

// Socket Events Service Mock
export const mockSocketEventsService = {
  emitNewMessage: vi.fn().mockResolvedValue(undefined),
  emitMessageUpdate: vi.fn().mockResolvedValue(undefined),
  emitNewConversation: vi.fn().mockResolvedValue(undefined),
  emitConversationUpdate: vi.fn().mockResolvedValue(undefined),
  emitNotification: vi.fn().mockResolvedValue(undefined),
};

// Reset all mocks
export const resetAllMocks = () => {
  vi.clearAllMocks();
};
