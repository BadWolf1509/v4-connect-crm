import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock database
const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
};

vi.mock('../../lib/db', () => ({
  db: mockDb,
  schema: {
    channels: { id: 'id', provider: 'provider', config: 'config', isActive: 'isActive' },
  },
}));

// Mock Redis publish functions
vi.mock('../../lib/redis', () => ({
  publishNewMessage: vi.fn().mockResolvedValue(undefined),
  publishNewConversation: vi.fn().mockResolvedValue(undefined),
  publishConversationUpdate: vi.fn().mockResolvedValue(undefined),
}));

// Mock services
const mockContactsService = {
  findByPhone: vi.fn(),
  create: vi.fn(),
};

const mockConversationsService = {
  findOrCreate: vi.fn(),
  findById: vi.fn(),
};

const mockMessagesService = {
  create: vi.fn(),
};

vi.mock('../../services/contacts.service', () => ({
  contactsService: mockContactsService,
}));

vi.mock('../../services/conversations.service', () => ({
  conversationsService: mockConversationsService,
}));

vi.mock('../../services/messages.service', () => ({
  messagesService: mockMessagesService,
}));

// Import after mocking
const { webhooksRoutes } = await import('../../routes/webhooks');
const { publishNewMessage, publishNewConversation, publishConversationUpdate } = await import(
  '../../lib/redis'
);

const createMockChannel = (overrides = {}) => ({
  id: 'channel-123',
  tenantId: 'tenant-123',
  type: 'whatsapp',
  provider: 'evolution',
  name: 'WhatsApp Channel',
  config: { instanceName: 'test-instance' },
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const createMockContact = (overrides = {}) => ({
  id: 'contact-123',
  tenantId: 'tenant-123',
  name: 'John Doe',
  phone: '5511999999999',
  avatarUrl: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const createMockConversation = (overrides = {}) => ({
  id: 'conversation-123',
  tenantId: 'tenant-123',
  channelId: 'channel-123',
  contactId: 'contact-123',
  status: 'open',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const createMockMessage = (overrides = {}) => ({
  id: 'message-123',
  tenantId: 'tenant-123',
  conversationId: 'conversation-123',
  senderId: 'contact-123',
  senderType: 'contact',
  type: 'text',
  content: 'Hello',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe('Webhooks Routes', () => {
  let app: Hono;

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono();
    app.route('/webhooks', webhooksRoutes);
  });

  describe('POST /webhooks/whatsapp/official', () => {
    it('should accept WhatsApp Official webhook', async () => {
      const res = await app.request('/webhooks/whatsapp/official', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entry: [{ changes: [{ value: { messages: [] } }] }] }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });
  });

  describe('GET /webhooks/whatsapp/official', () => {
    it('should verify WhatsApp Official webhook with correct token', async () => {
      const originalToken = process.env.WHATSAPP_VERIFY_TOKEN;
      process.env.WHATSAPP_VERIFY_TOKEN = 'test-token';

      const res = await app.request(
        '/webhooks/whatsapp/official?hub.mode=subscribe&hub.verify_token=test-token&hub.challenge=challenge123',
        { method: 'GET' },
      );

      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toBe('challenge123');

      process.env.WHATSAPP_VERIFY_TOKEN = originalToken;
    });

    it('should return 403 for invalid token', async () => {
      const res = await app.request(
        '/webhooks/whatsapp/official?hub.mode=subscribe&hub.verify_token=wrong-token&hub.challenge=challenge123',
        { method: 'GET' },
      );

      expect(res.status).toBe(403);
    });

    it('should return 403 for wrong mode', async () => {
      const originalToken = process.env.WHATSAPP_VERIFY_TOKEN;
      process.env.WHATSAPP_VERIFY_TOKEN = 'test-token';

      const res = await app.request(
        '/webhooks/whatsapp/official?hub.mode=unsubscribe&hub.verify_token=test-token&hub.challenge=challenge123',
        { method: 'GET' },
      );

      expect(res.status).toBe(403);

      process.env.WHATSAPP_VERIFY_TOKEN = originalToken;
    });
  });

  describe('POST /webhooks/whatsapp/evolution', () => {
    it('should handle messages.upsert event with new contact', async () => {
      const mockChannel = createMockChannel();
      const mockContact = createMockContact();
      const mockConversation = createMockConversation();
      const mockMessage = createMockMessage();

      mockDb.limit.mockResolvedValue([mockChannel]);
      mockContactsService.findByPhone.mockResolvedValue(null);
      mockContactsService.create.mockResolvedValue(mockContact);
      mockConversationsService.findOrCreate.mockResolvedValue({
        conversation: mockConversation,
        created: true,
      });
      mockMessagesService.create.mockResolvedValue(mockMessage);
      mockConversationsService.findById.mockResolvedValue(mockConversation);

      const res = await app.request('/webhooks/whatsapp/evolution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'messages.upsert',
          instance: 'test-instance',
          data: {
            key: {
              remoteJid: '5511999999999@s.whatsapp.net',
              fromMe: false,
              id: 'msg-123',
            },
            pushName: 'John Doe',
            message: { conversation: 'Hello!' },
            messageTimestamp: Date.now(),
          },
        }),
      });

      expect(res.status).toBe(200);
      expect(mockContactsService.create).toHaveBeenCalled();
      expect(mockMessagesService.create).toHaveBeenCalled();
      expect(publishNewConversation).toHaveBeenCalled();
    });

    it('should handle messages.upsert event with existing contact', async () => {
      const mockChannel = createMockChannel();
      const mockContact = createMockContact();
      const mockConversation = createMockConversation();
      const mockMessage = createMockMessage();

      mockDb.limit.mockResolvedValue([mockChannel]);
      mockContactsService.findByPhone.mockResolvedValue(mockContact);
      mockConversationsService.findOrCreate.mockResolvedValue({
        conversation: mockConversation,
        created: false,
      });
      mockMessagesService.create.mockResolvedValue(mockMessage);
      mockConversationsService.findById.mockResolvedValue(mockConversation);

      const res = await app.request('/webhooks/whatsapp/evolution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'messages.upsert',
          instance: 'test-instance',
          data: {
            key: {
              remoteJid: '5511999999999@s.whatsapp.net',
              fromMe: false,
              id: 'msg-123',
            },
            message: { conversation: 'Hello!' },
            messageTimestamp: Date.now(),
          },
        }),
      });

      expect(res.status).toBe(200);
      expect(mockContactsService.create).not.toHaveBeenCalled();
      expect(publishConversationUpdate).toHaveBeenCalled();
    });

    it('should skip messages from bot (fromMe = true)', async () => {
      const mockChannel = createMockChannel();
      mockDb.limit.mockResolvedValue([mockChannel]);

      const res = await app.request('/webhooks/whatsapp/evolution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'messages.upsert',
          instance: 'test-instance',
          data: {
            key: {
              remoteJid: '5511999999999@s.whatsapp.net',
              fromMe: true,
              id: 'msg-123',
            },
            message: { conversation: 'Hello!' },
          },
        }),
      });

      expect(res.status).toBe(200);
      expect(mockContactsService.findByPhone).not.toHaveBeenCalled();
    });

    it('should handle image message type', async () => {
      const mockChannel = createMockChannel();
      const mockContact = createMockContact();
      const mockConversation = createMockConversation();
      const mockMessage = createMockMessage({ type: 'image' });

      mockDb.limit.mockResolvedValue([mockChannel]);
      mockContactsService.findByPhone.mockResolvedValue(mockContact);
      mockConversationsService.findOrCreate.mockResolvedValue({
        conversation: mockConversation,
        created: false,
      });
      mockMessagesService.create.mockResolvedValue(mockMessage);
      mockConversationsService.findById.mockResolvedValue(mockConversation);

      const res = await app.request('/webhooks/whatsapp/evolution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'messages.upsert',
          instance: 'test-instance',
          data: {
            key: {
              remoteJid: '5511999999999@s.whatsapp.net',
              fromMe: false,
              id: 'msg-123',
            },
            message: {
              imageMessage: {
                caption: 'Check this out',
                url: 'https://example.com/image.jpg',
              },
            },
            messageTimestamp: Date.now(),
          },
        }),
      });

      expect(res.status).toBe(200);
      expect(mockMessagesService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'image',
          mediaUrl: 'https://example.com/image.jpg',
        }),
      );
    });

    it('should handle video message type', async () => {
      const mockChannel = createMockChannel();
      const mockContact = createMockContact();
      const mockConversation = createMockConversation();

      mockDb.limit.mockResolvedValue([mockChannel]);
      mockContactsService.findByPhone.mockResolvedValue(mockContact);
      mockConversationsService.findOrCreate.mockResolvedValue({
        conversation: mockConversation,
        created: false,
      });
      mockMessagesService.create.mockResolvedValue(createMockMessage({ type: 'video' }));
      mockConversationsService.findById.mockResolvedValue(mockConversation);

      const res = await app.request('/webhooks/whatsapp/evolution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'messages.upsert',
          instance: 'test-instance',
          data: {
            key: {
              remoteJid: '5511999999999@s.whatsapp.net',
              fromMe: false,
              id: 'msg-123',
            },
            message: {
              videoMessage: {
                caption: 'Video caption',
                url: 'https://example.com/video.mp4',
              },
            },
            messageTimestamp: Date.now(),
          },
        }),
      });

      expect(res.status).toBe(200);
    });

    it('should handle audio message type', async () => {
      const mockChannel = createMockChannel();
      const mockContact = createMockContact();
      const mockConversation = createMockConversation();

      mockDb.limit.mockResolvedValue([mockChannel]);
      mockContactsService.findByPhone.mockResolvedValue(mockContact);
      mockConversationsService.findOrCreate.mockResolvedValue({
        conversation: mockConversation,
        created: false,
      });
      mockMessagesService.create.mockResolvedValue(createMockMessage({ type: 'audio' }));
      mockConversationsService.findById.mockResolvedValue(mockConversation);

      const res = await app.request('/webhooks/whatsapp/evolution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'messages.upsert',
          instance: 'test-instance',
          data: {
            key: {
              remoteJid: '5511999999999@s.whatsapp.net',
              fromMe: false,
              id: 'msg-123',
            },
            message: {
              audioMessage: {
                url: 'https://example.com/audio.ogg',
              },
            },
            messageTimestamp: Date.now(),
          },
        }),
      });

      expect(res.status).toBe(200);
    });

    it('should handle document message type', async () => {
      const mockChannel = createMockChannel();
      const mockContact = createMockContact();
      const mockConversation = createMockConversation();

      mockDb.limit.mockResolvedValue([mockChannel]);
      mockContactsService.findByPhone.mockResolvedValue(mockContact);
      mockConversationsService.findOrCreate.mockResolvedValue({
        conversation: mockConversation,
        created: false,
      });
      mockMessagesService.create.mockResolvedValue(createMockMessage({ type: 'document' }));
      mockConversationsService.findById.mockResolvedValue(mockConversation);

      const res = await app.request('/webhooks/whatsapp/evolution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'messages.upsert',
          instance: 'test-instance',
          data: {
            key: {
              remoteJid: '5511999999999@s.whatsapp.net',
              fromMe: false,
              id: 'msg-123',
            },
            message: {
              documentMessage: {
                fileName: 'report.pdf',
                url: 'https://example.com/report.pdf',
              },
            },
            messageTimestamp: Date.now(),
          },
        }),
      });

      expect(res.status).toBe(200);
    });

    it('should handle extendedTextMessage type', async () => {
      const mockChannel = createMockChannel();
      const mockContact = createMockContact();
      const mockConversation = createMockConversation();

      mockDb.limit.mockResolvedValue([mockChannel]);
      mockContactsService.findByPhone.mockResolvedValue(mockContact);
      mockConversationsService.findOrCreate.mockResolvedValue({
        conversation: mockConversation,
        created: false,
      });
      mockMessagesService.create.mockResolvedValue(createMockMessage());
      mockConversationsService.findById.mockResolvedValue(mockConversation);

      const res = await app.request('/webhooks/whatsapp/evolution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'messages.upsert',
          instance: 'test-instance',
          data: {
            key: {
              remoteJid: '5511999999999@s.whatsapp.net',
              fromMe: false,
              id: 'msg-123',
            },
            message: {
              extendedTextMessage: {
                text: 'Extended message with link',
              },
            },
            messageTimestamp: Date.now(),
          },
        }),
      });

      expect(res.status).toBe(200);
    });

    it('should return success when channel not found', async () => {
      mockDb.limit.mockResolvedValue([]);

      const res = await app.request('/webhooks/whatsapp/evolution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'messages.upsert',
          instance: 'unknown-instance',
          data: {},
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.message).toBe('Channel not found');
    });

    it('should handle messages.update event', async () => {
      const mockChannel = createMockChannel();
      mockDb.limit.mockResolvedValue([mockChannel]);

      const res = await app.request('/webhooks/whatsapp/evolution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'messages.update',
          instance: 'test-instance',
          data: [
            {
              key: { id: 'msg-123' },
              update: { status: 'DELIVERY_ACK' },
            },
          ],
        }),
      });

      expect(res.status).toBe(200);
    });

    it('should handle various message status updates', async () => {
      const mockChannel = createMockChannel();
      mockDb.limit.mockResolvedValue([mockChannel]);

      const statuses = ['PENDING', 'SERVER_ACK', 'DELIVERY_ACK', 'READ', 'PLAYED'];

      for (const status of statuses) {
        const res = await app.request('/webhooks/whatsapp/evolution', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'messages.update',
            instance: 'test-instance',
            data: [
              {
                key: { id: 'msg-123' },
                update: { status },
              },
            ],
          }),
        });

        expect(res.status).toBe(200);
      }
    });

    it('should handle connection.update open event', async () => {
      const mockChannel = createMockChannel();
      mockDb.limit.mockResolvedValue([mockChannel]);

      const res = await app.request('/webhooks/whatsapp/evolution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'connection.update',
          instance: 'test-instance',
          data: { state: 'open' },
        }),
      });

      expect(res.status).toBe(200);
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should handle connection.update close event', async () => {
      const mockChannel = createMockChannel();
      mockDb.limit.mockResolvedValue([mockChannel]);

      const res = await app.request('/webhooks/whatsapp/evolution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'connection.update',
          instance: 'test-instance',
          data: { state: 'close' },
        }),
      });

      expect(res.status).toBe(200);
    });

    it('should handle qrcode.updated event', async () => {
      const mockChannel = createMockChannel();
      mockDb.limit.mockResolvedValue([mockChannel]);

      const res = await app.request('/webhooks/whatsapp/evolution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'qrcode.updated',
          instance: 'test-instance',
          data: { qrcode: 'base64-qr-data' },
        }),
      });

      expect(res.status).toBe(200);
    });

    it('should handle instance.delete event', async () => {
      const mockChannel = createMockChannel();
      mockDb.limit.mockResolvedValue([mockChannel]);

      const res = await app.request('/webhooks/whatsapp/evolution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'instance.delete',
          instance: 'test-instance',
        }),
      });

      expect(res.status).toBe(200);
      expect(mockDb.delete).toHaveBeenCalled();
    });

    it('should handle instance.logout event', async () => {
      const mockChannel = createMockChannel();
      mockDb.limit.mockResolvedValue([mockChannel]);

      const res = await app.request('/webhooks/whatsapp/evolution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'instance.logout',
          instance: 'test-instance',
        }),
      });

      expect(res.status).toBe(200);
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockDb.limit.mockRejectedValue(new Error('Database error'));

      const res = await app.request('/webhooks/whatsapp/evolution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'messages.upsert',
          instance: 'test-instance',
          data: {},
        }),
      });

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.success).toBe(false);
    });
  });

  describe('POST /webhooks/instagram', () => {
    it('should accept Instagram webhook', async () => {
      const res = await app.request('/webhooks/instagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entry: [] }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });
  });

  describe('GET /webhooks/instagram', () => {
    it('should verify Instagram webhook with correct token', async () => {
      const originalToken = process.env.INSTAGRAM_VERIFY_TOKEN;
      process.env.INSTAGRAM_VERIFY_TOKEN = 'instagram-token';

      const res = await app.request(
        '/webhooks/instagram?hub.mode=subscribe&hub.verify_token=instagram-token&hub.challenge=ig-challenge',
        { method: 'GET' },
      );

      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toBe('ig-challenge');

      process.env.INSTAGRAM_VERIFY_TOKEN = originalToken;
    });

    it('should return 403 for invalid token', async () => {
      const res = await app.request(
        '/webhooks/instagram?hub.mode=subscribe&hub.verify_token=wrong-token&hub.challenge=challenge',
        { method: 'GET' },
      );

      expect(res.status).toBe(403);
    });
  });

  describe('POST /webhooks/messenger', () => {
    it('should accept Messenger webhook', async () => {
      const res = await app.request('/webhooks/messenger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entry: [] }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });
  });

  describe('GET /webhooks/messenger', () => {
    it('should verify Messenger webhook with correct token', async () => {
      const originalToken = process.env.MESSENGER_VERIFY_TOKEN;
      process.env.MESSENGER_VERIFY_TOKEN = 'messenger-token';

      const res = await app.request(
        '/webhooks/messenger?hub.mode=subscribe&hub.verify_token=messenger-token&hub.challenge=msg-challenge',
        { method: 'GET' },
      );

      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toBe('msg-challenge');

      process.env.MESSENGER_VERIFY_TOKEN = originalToken;
    });

    it('should return 403 for invalid token', async () => {
      const res = await app.request(
        '/webhooks/messenger?hub.mode=subscribe&hub.verify_token=wrong-token&hub.challenge=challenge',
        { method: 'GET' },
      );

      expect(res.status).toBe(403);
    });
  });

  describe('POST /webhooks/automation/:automationId', () => {
    it('should accept automation webhook', async () => {
      const res = await app.request('/webhooks/automation/auto-123', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trigger: 'test', data: { foo: 'bar' } }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });
  });
});
