import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockChannel } from '../mocks/db.mock';

// Mock the services
const mockChannelsService = {
  findAll: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
};

const mockEvolutionService = {
  createInstance: vi.fn(),
  deleteInstance: vi.fn(),
  connectInstance: vi.fn(),
  getInstanceState: vi.fn(),
  logoutInstance: vi.fn(),
  setWebhook: vi.fn(),
  sendText: vi.fn(),
  sendImage: vi.fn(),
  sendAudio: vi.fn(),
  sendDocument: vi.fn(),
  checkNumber: vi.fn(),
};

vi.mock('../../services/channels.service', () => ({
  channelsService: mockChannelsService,
}));

vi.mock('../../services/evolution.service', () => ({
  evolutionService: mockEvolutionService,
}));

// Import after mocking
const { whatsappRoutes } = await import('../../routes/whatsapp');

// Create a valid test token
const createAuthToken = () => {
  const session = {
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      role: 'admin',
      tenantId: 'test-tenant-id',
    },
    expires: new Date(Date.now() + 3600000).toISOString(),
  };
  return Buffer.from(JSON.stringify(session)).toString('base64');
};

const authHeaders = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${createAuthToken()}`,
};

describe('WhatsApp Routes', () => {
  let app: Hono;

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono();
    app.route('/whatsapp', whatsappRoutes);
  });

  describe('POST /whatsapp/instances', () => {
    it('should create a new WhatsApp instance', async () => {
      mockEvolutionService.createInstance.mockResolvedValue({
        success: true,
        data: { instance: { instanceName: 'test-tenant-id-test-channel' } },
      });
      mockEvolutionService.setWebhook.mockResolvedValue({ success: true });
      mockChannelsService.create.mockResolvedValue(createMockChannel());

      const res = await app.request('/whatsapp/instances', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          name: 'Test Channel',
          phone: '+5511999999999',
        }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.channel).toBeDefined();
      expect(mockEvolutionService.createInstance).toHaveBeenCalled();
      expect(mockEvolutionService.setWebhook).toHaveBeenCalled();
    });

    it('should return 500 if Evolution API fails', async () => {
      mockEvolutionService.createInstance.mockResolvedValue({
        success: false,
        error: 'Connection failed',
      });

      const res = await app.request('/whatsapp/instances', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          name: 'Test Channel',
        }),
      });

      expect(res.status).toBe(500);
    });

    it('should validate name is required', async () => {
      const res = await app.request('/whatsapp/instances', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /whatsapp/instances/:channelId/qrcode', () => {
    it('should return QR code for instance', async () => {
      mockChannelsService.findById.mockResolvedValue(
        createMockChannel({ config: { instanceName: 'test-instance' } }),
      );
      mockEvolutionService.connectInstance.mockResolvedValue({
        success: true,
        data: { base64: 'qr-code-base64', pairingCode: '12345678' },
      });

      const res = await app.request('/whatsapp/instances/channel-123/qrcode', {
        method: 'GET',
        headers: authHeaders,
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.base64).toBe('qr-code-base64');
    });

    it('should return 404 if channel not found', async () => {
      mockChannelsService.findById.mockResolvedValue(null);

      const res = await app.request('/whatsapp/instances/nonexistent/qrcode', {
        method: 'GET',
        headers: authHeaders,
      });

      expect(res.status).toBe(404);
    });

    it('should return 400 if channel is not WhatsApp', async () => {
      mockChannelsService.findById.mockResolvedValue(createMockChannel({ type: 'instagram' }));

      const res = await app.request('/whatsapp/instances/channel-123/qrcode', {
        method: 'GET',
        headers: authHeaders,
      });

      expect(res.status).toBe(400);
    });

    it('should return 400 if instance not configured', async () => {
      mockChannelsService.findById.mockResolvedValue(createMockChannel({ config: {} }));

      const res = await app.request('/whatsapp/instances/channel-123/qrcode', {
        method: 'GET',
        headers: authHeaders,
      });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /whatsapp/instances/:channelId/state', () => {
    it('should return instance connection state', async () => {
      mockChannelsService.findById.mockResolvedValue(
        createMockChannel({ config: { instanceName: 'test-instance' }, isActive: false }),
      );
      mockEvolutionService.getInstanceState.mockResolvedValue({
        success: true,
        data: { instance: { state: 'open' } },
      });
      mockChannelsService.connect.mockResolvedValue(createMockChannel({ isActive: true }));

      const res = await app.request('/whatsapp/instances/channel-123/state', {
        method: 'GET',
        headers: authHeaders,
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.state).toBe('open');
      expect(data.isActive).toBe(true);
    });

    it('should disconnect channel when state is not open', async () => {
      mockChannelsService.findById.mockResolvedValue(
        createMockChannel({ config: { instanceName: 'test-instance' }, isActive: true }),
      );
      mockEvolutionService.getInstanceState.mockResolvedValue({
        success: true,
        data: { instance: { state: 'close' } },
      });
      mockChannelsService.disconnect.mockResolvedValue(createMockChannel({ isActive: false }));

      const res = await app.request('/whatsapp/instances/channel-123/state', {
        method: 'GET',
        headers: authHeaders,
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.isActive).toBe(false);
      expect(mockChannelsService.disconnect).toHaveBeenCalled();
    });
  });

  describe('POST /whatsapp/instances/:channelId/disconnect', () => {
    it('should disconnect WhatsApp instance', async () => {
      mockChannelsService.findById.mockResolvedValue(
        createMockChannel({ config: { instanceName: 'test-instance' } }),
      );
      mockEvolutionService.logoutInstance.mockResolvedValue({ success: true });
      mockChannelsService.disconnect.mockResolvedValue(createMockChannel({ isActive: false }));

      const res = await app.request('/whatsapp/instances/channel-123/disconnect', {
        method: 'POST',
        headers: authHeaders,
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.disconnected).toBe(true);
    });
  });

  describe('DELETE /whatsapp/instances/:channelId', () => {
    it('should delete WhatsApp instance', async () => {
      mockChannelsService.findById.mockResolvedValue(
        createMockChannel({ config: { instanceName: 'test-instance' } }),
      );
      mockEvolutionService.deleteInstance.mockResolvedValue({ success: true });
      mockChannelsService.delete.mockResolvedValue(createMockChannel());

      const res = await app.request('/whatsapp/instances/channel-123', {
        method: 'DELETE',
        headers: authHeaders,
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.deleted).toBe(true);
    });
  });

  describe('POST /whatsapp/send', () => {
    it('should send text message', async () => {
      mockChannelsService.findById.mockResolvedValue(
        createMockChannel({ config: { instanceName: 'test-instance' } }),
      );
      mockEvolutionService.sendText.mockResolvedValue({
        success: true,
        data: { key: { id: 'msg-123' } },
      });

      const res = await app.request('/whatsapp/send', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          channelId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          number: '+5511999999999',
          type: 'text',
          content: 'Hello, World!',
        }),
      });

      expect(res.status).toBe(201);
      expect(mockEvolutionService.sendText).toHaveBeenCalled();
    });

    it('should send image message', async () => {
      mockChannelsService.findById.mockResolvedValue(
        createMockChannel({ config: { instanceName: 'test-instance' } }),
      );
      mockEvolutionService.sendImage.mockResolvedValue({
        success: true,
        data: { key: { id: 'msg-123' } },
      });

      const res = await app.request('/whatsapp/send', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          channelId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          number: '+5511999999999',
          type: 'image',
          mediaUrl: 'https://example.com/image.jpg',
          content: 'Image caption',
        }),
      });

      expect(res.status).toBe(201);
      expect(mockEvolutionService.sendImage).toHaveBeenCalled();
    });

    it('should validate content required for text messages', async () => {
      mockChannelsService.findById.mockResolvedValue(
        createMockChannel({ config: { instanceName: 'test-instance' } }),
      );

      const res = await app.request('/whatsapp/send', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          channelId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          number: '+5511999999999',
          type: 'text',
          // missing content
        }),
      });

      expect(res.status).toBe(400);
    });

    it('should validate mediaUrl required for image messages', async () => {
      mockChannelsService.findById.mockResolvedValue(
        createMockChannel({ config: { instanceName: 'test-instance' } }),
      );

      const res = await app.request('/whatsapp/send', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          channelId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          number: '+5511999999999',
          type: 'image',
          // missing mediaUrl
        }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /whatsapp/sync', () => {
    it('should sync channels with Evolution API', async () => {
      mockChannelsService.findAll.mockResolvedValue({
        channels: [
          createMockChannel({
            provider: 'evolution',
            config: { instanceName: 'test-instance' },
            isActive: false,
          }),
        ],
      });
      mockEvolutionService.getInstanceState.mockResolvedValue({
        success: true,
        data: { instance: { state: 'open' } },
      });
      mockChannelsService.connect.mockResolvedValue(createMockChannel({ isActive: true }));

      const res = await app.request('/whatsapp/sync', {
        method: 'POST',
        headers: authHeaders,
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.results.connected).toBe(1);
    });

    it('should handle sync errors gracefully', async () => {
      mockChannelsService.findAll.mockResolvedValue({
        channels: [
          createMockChannel({
            provider: 'evolution',
            config: { instanceName: 'test-instance' },
          }),
        ],
      });
      mockEvolutionService.getInstanceState.mockRejectedValue(new Error('Connection failed'));

      const res = await app.request('/whatsapp/sync', {
        method: 'POST',
        headers: authHeaders,
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.results.errors).toBe(1);
    });
  });

  describe('POST /whatsapp/check-numbers', () => {
    it('should check if numbers are on WhatsApp', async () => {
      mockChannelsService.findById.mockResolvedValue(
        createMockChannel({ config: { instanceName: 'test-instance' } }),
      );
      mockEvolutionService.checkNumber.mockResolvedValue({
        success: true,
        data: [
          { exists: true, jid: '5511999999999@s.whatsapp.net' },
          { exists: false, jid: '5511888888888@s.whatsapp.net' },
        ],
      });

      const res = await app.request('/whatsapp/check-numbers', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          channelId: 'channel-123',
          numbers: ['+5511999999999', '+5511888888888'],
        }),
      });

      expect(res.status).toBe(200);
      expect(mockEvolutionService.checkNumber).toHaveBeenCalled();
    });

    it('should validate required fields', async () => {
      const res = await app.request('/whatsapp/check-numbers', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
    });
  });
});
