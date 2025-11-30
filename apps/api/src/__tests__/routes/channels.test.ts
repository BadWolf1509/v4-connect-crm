import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockChannel } from '../mocks/db.mock';

// Mock the channels service
const mockChannelsService = {
  findAll: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
};

vi.mock('../../services/channels.service', () => ({
  channelsService: mockChannelsService,
}));

// Import after mocking
const { channelsRoutes } = await import('../../routes/channels');

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

describe('Channels Routes', () => {
  let app: Hono;

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono();
    app.route('/channels', channelsRoutes);
  });

  describe('GET /channels', () => {
    it('should return list of channels', async () => {
      const mockChannels = [createMockChannel(), createMockChannel({ id: 'channel-456' })];
      mockChannelsService.findAll.mockResolvedValue({ channels: mockChannels });

      const res = await app.request('/channels', {
        method: 'GET',
        headers: authHeaders,
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data).toHaveLength(2);
      expect(mockChannelsService.findAll).toHaveBeenCalledWith({
        tenantId: 'test-tenant-id',
        type: undefined,
        isActive: undefined,
      });
    });

    it('should filter by type', async () => {
      mockChannelsService.findAll.mockResolvedValue({ channels: [createMockChannel()] });

      const res = await app.request('/channels?type=whatsapp', {
        method: 'GET',
        headers: authHeaders,
      });

      expect(res.status).toBe(200);
      expect(mockChannelsService.findAll).toHaveBeenCalledWith({
        tenantId: 'test-tenant-id',
        type: 'whatsapp',
        isActive: undefined,
      });
    });

    it('should filter by isActive', async () => {
      mockChannelsService.findAll.mockResolvedValue({ channels: [] });

      const res = await app.request('/channels?isActive=true', {
        method: 'GET',
        headers: authHeaders,
      });

      expect(res.status).toBe(200);
      expect(mockChannelsService.findAll).toHaveBeenCalledWith({
        tenantId: 'test-tenant-id',
        type: undefined,
        isActive: true,
      });
    });

    it('should return 401 without auth', async () => {
      const res = await app.request('/channels', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /channels/:id', () => {
    it('should return a channel by id', async () => {
      const mockChannel = createMockChannel();
      mockChannelsService.findById.mockResolvedValue(mockChannel);

      const res = await app.request('/channels/channel-123', {
        method: 'GET',
        headers: authHeaders,
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.id).toBe('channel-123');
      expect(mockChannelsService.findById).toHaveBeenCalledWith('channel-123', 'test-tenant-id');
    });

    it('should return 404 if channel not found', async () => {
      mockChannelsService.findById.mockResolvedValue(null);

      const res = await app.request('/channels/nonexistent', {
        method: 'GET',
        headers: authHeaders,
      });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /channels', () => {
    it('should create a new channel', async () => {
      const newChannel = createMockChannel();
      mockChannelsService.create.mockResolvedValue(newChannel);

      const res = await app.request('/channels', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          type: 'whatsapp',
          name: 'WhatsApp Principal',
          phoneNumber: '+5511999999999',
        }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.id).toBe('channel-123');
      expect(mockChannelsService.create).toHaveBeenCalled();
    });

    it('should validate required fields', async () => {
      const res = await app.request('/channels', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          type: 'whatsapp',
          // missing name
        }),
      });

      expect(res.status).toBe(400);
    });

    it('should validate channel type enum', async () => {
      const res = await app.request('/channels', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          type: 'invalid-type',
          name: 'Test Channel',
        }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /channels/:id', () => {
    it('should update a channel', async () => {
      const updatedChannel = createMockChannel({ name: 'Updated Name' });
      mockChannelsService.update.mockResolvedValue(updatedChannel);

      const res = await app.request('/channels/channel-123', {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({
          name: 'Updated Name',
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.name).toBe('Updated Name');
      expect(mockChannelsService.update).toHaveBeenCalledWith('channel-123', 'test-tenant-id', {
        name: 'Updated Name',
      });
    });

    it('should return 404 if channel not found', async () => {
      mockChannelsService.update.mockResolvedValue(null);

      const res = await app.request('/channels/nonexistent', {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ name: 'New Name' }),
      });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /channels/:id', () => {
    it('should delete a channel', async () => {
      mockChannelsService.delete.mockResolvedValue(createMockChannel());

      const res = await app.request('/channels/channel-123', {
        method: 'DELETE',
        headers: authHeaders,
      });

      expect(res.status).toBe(200);
      expect(mockChannelsService.delete).toHaveBeenCalledWith('channel-123', 'test-tenant-id');
    });

    it('should return 404 if channel not found', async () => {
      mockChannelsService.delete.mockResolvedValue(null);

      const res = await app.request('/channels/nonexistent', {
        method: 'DELETE',
        headers: authHeaders,
      });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /channels/:id/connect', () => {
    it('should connect a channel', async () => {
      const mockChannel = createMockChannel();
      mockChannelsService.findById.mockResolvedValue(mockChannel);
      mockChannelsService.connect.mockResolvedValue({ ...mockChannel, isActive: true });

      const res = await app.request('/channels/channel-123/connect', {
        method: 'POST',
        headers: authHeaders,
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.channel.isActive).toBe(true);
    });

    it('should return 404 if channel not found', async () => {
      mockChannelsService.findById.mockResolvedValue(null);

      const res = await app.request('/channels/nonexistent/connect', {
        method: 'POST',
        headers: authHeaders,
      });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /channels/:id/disconnect', () => {
    it('should disconnect a channel', async () => {
      const mockChannel = createMockChannel({ isActive: false });
      mockChannelsService.disconnect.mockResolvedValue(mockChannel);

      const res = await app.request('/channels/channel-123/disconnect', {
        method: 'POST',
        headers: authHeaders,
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.isActive).toBe(false);
    });

    it('should return 404 if channel not found', async () => {
      mockChannelsService.disconnect.mockResolvedValue(null);

      const res = await app.request('/channels/nonexistent/disconnect', {
        method: 'POST',
        headers: authHeaders,
      });

      expect(res.status).toBe(404);
    });
  });
});
