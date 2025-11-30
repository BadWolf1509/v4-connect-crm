import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Set environment variables
process.env.EVOLUTION_API_URL = 'http://localhost:8080';
process.env.EVOLUTION_API_KEY = 'test-api-key';

// Import after setting env vars
const { evolutionService } = await import('../../services/evolution.service');

describe('Evolution Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  const mockSuccessResponse = (data: unknown) => ({
    ok: true,
    json: () => Promise.resolve(data),
  });

  const mockErrorResponse = (status: number, message: string) => ({
    ok: false,
    status,
    text: () => Promise.resolve(message),
  });

  describe('createInstance', () => {
    it('should create a new instance successfully', async () => {
      const responseData = {
        instance: { instanceName: 'test-instance', status: 'close' },
      };
      mockFetch.mockResolvedValue(mockSuccessResponse(responseData));

      const result = await evolutionService.createInstance('test-instance');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(responseData);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/instance/create',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            apikey: 'test-api-key',
          }),
        }),
      );
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValue(mockErrorResponse(500, 'Internal Server Error'));

      const result = await evolutionService.createInstance('test-instance');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Internal Server Error');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await evolutionService.createInstance('test-instance');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should pass integration option', async () => {
      mockFetch.mockResolvedValue(mockSuccessResponse({}));

      await evolutionService.createInstance('test-instance', {
        integration: 'WHATSAPP-BUSINESS',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('WHATSAPP-BUSINESS'),
        }),
      );
    });
  });

  describe('connectInstance', () => {
    it('should get QR code for instance', async () => {
      const responseData = {
        base64: 'qr-code-base64',
        pairingCode: '12345678',
      };
      mockFetch.mockResolvedValue(mockSuccessResponse(responseData));

      const result = await evolutionService.connectInstance('test-instance');

      expect(result.success).toBe(true);
      expect(result.data?.base64).toBe('qr-code-base64');
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/instance/connect/test-instance',
        expect.objectContaining({ method: 'GET' }),
      );
    });
  });

  describe('getInstanceState', () => {
    it('should return instance state', async () => {
      const responseData = { instance: { state: 'open' } };
      mockFetch.mockResolvedValue(mockSuccessResponse(responseData));

      const result = await evolutionService.getInstanceState('test-instance');

      expect(result.success).toBe(true);
      expect(result.data?.instance.state).toBe('open');
    });
  });

  describe('deleteInstance', () => {
    it('should delete instance', async () => {
      mockFetch.mockResolvedValue(mockSuccessResponse({ deleted: true }));

      const result = await evolutionService.deleteInstance('test-instance');

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/instance/delete/test-instance',
        expect.objectContaining({ method: 'DELETE' }),
      );
    });
  });

  describe('logoutInstance', () => {
    it('should logout instance without deleting', async () => {
      mockFetch.mockResolvedValue(mockSuccessResponse({ logout: true }));

      const result = await evolutionService.logoutInstance('test-instance');

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/instance/logout/test-instance',
        expect.objectContaining({ method: 'DELETE' }),
      );
    });
  });

  describe('sendText', () => {
    it('should send text message', async () => {
      const responseData = {
        key: { remoteJid: '5511999999999@s.whatsapp.net', fromMe: true, id: 'msg-123' },
        message: { conversation: 'Hello' },
      };
      mockFetch.mockResolvedValue(mockSuccessResponse(responseData));

      const result = await evolutionService.sendText('test-instance', {
        number: '+5511999999999',
        text: 'Hello',
      });

      expect(result.success).toBe(true);
      expect(result.data?.key.id).toBe('msg-123');
    });

    it('should include delay and linkPreview options', async () => {
      mockFetch.mockResolvedValue(mockSuccessResponse({}));

      await evolutionService.sendText('test-instance', {
        number: '+5511999999999',
        text: 'Hello',
        delay: 1000,
        linkPreview: true,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"delay":1000'),
        }),
      );
    });
  });

  describe('sendImage', () => {
    it('should send image message', async () => {
      mockFetch.mockResolvedValue(mockSuccessResponse({ key: { id: 'msg-123' } }));

      const result = await evolutionService.sendImage('test-instance', {
        number: '+5511999999999',
        image: 'https://example.com/image.jpg',
        caption: 'Check this out!',
      });

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/message/sendMedia/test-instance',
        expect.objectContaining({
          body: expect.stringContaining('"mediatype":"image"'),
        }),
      );
    });
  });

  describe('sendAudio', () => {
    it('should send audio message', async () => {
      mockFetch.mockResolvedValue(mockSuccessResponse({ key: { id: 'msg-123' } }));

      const result = await evolutionService.sendAudio('test-instance', {
        number: '+5511999999999',
        audio: 'https://example.com/audio.ogg',
      });

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"mediatype":"audio"'),
        }),
      );
    });
  });

  describe('sendDocument', () => {
    it('should send document message', async () => {
      mockFetch.mockResolvedValue(mockSuccessResponse({ key: { id: 'msg-123' } }));

      const result = await evolutionService.sendDocument('test-instance', {
        number: '+5511999999999',
        document: 'https://example.com/file.pdf',
        fileName: 'document.pdf',
        mimetype: 'application/pdf',
      });

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"mediatype":"document"'),
        }),
      );
    });
  });

  describe('setWebhook', () => {
    it('should configure webhook', async () => {
      mockFetch.mockResolvedValue(mockSuccessResponse({ webhook: true }));

      const result = await evolutionService.setWebhook('test-instance', {
        enabled: true,
        url: 'https://example.com/webhook',
        webhookByEvents: false,
        webhookBase64: true,
        events: ['messages.upsert', 'connection.update'],
      });

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/webhook/set/test-instance',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"enabled":true'),
        }),
      );
    });
  });

  describe('checkNumber', () => {
    it('should check if numbers are on WhatsApp', async () => {
      const responseData = [
        { exists: true, jid: '5511999999999@s.whatsapp.net', number: '+5511999999999' },
        { exists: false, jid: '5511888888888@s.whatsapp.net', number: '+5511888888888' },
      ];
      mockFetch.mockResolvedValue(mockSuccessResponse(responseData));

      const result = await evolutionService.checkNumber('test-instance', [
        '+5511999999999',
        '+5511888888888',
      ]);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data?.[0].exists).toBe(true);
      expect(result.data?.[1].exists).toBe(false);
    });
  });

  describe('getProfilePicture', () => {
    it('should get profile picture URL', async () => {
      const responseData = {
        wuid: '5511999999999@s.whatsapp.net',
        profilePictureUrl: 'https://pps.whatsapp.net/...',
      };
      mockFetch.mockResolvedValue(mockSuccessResponse(responseData));

      const result = await evolutionService.getProfilePicture('test-instance', '+5511999999999');

      expect(result.success).toBe(true);
      expect(result.data?.profilePictureUrl).toBeDefined();
    });
  });

  describe('markAsRead', () => {
    it('should mark message as read', async () => {
      mockFetch.mockResolvedValue(mockSuccessResponse({ read: true }));

      const result = await evolutionService.markAsRead('test-instance', {
        remoteJid: '5511999999999@s.whatsapp.net',
        fromMe: false,
        id: 'msg-123',
      });

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'PUT' }),
      );
    });
  });

  describe('sendPresence', () => {
    it('should send presence update', async () => {
      mockFetch.mockResolvedValue(mockSuccessResponse({ presence: true }));

      const result = await evolutionService.sendPresence('test-instance', {
        number: '+5511999999999',
        presence: 'composing',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('getChatHistory', () => {
    it('should get chat history', async () => {
      const responseData = [
        { key: { remoteJid: '5511999999999@s.whatsapp.net', fromMe: false, id: 'msg-1' } },
        { key: { remoteJid: '5511999999999@s.whatsapp.net', fromMe: true, id: 'msg-2' } },
      ];
      mockFetch.mockResolvedValue(mockSuccessResponse(responseData));

      const result = await evolutionService.getChatHistory('test-instance', {
        remoteJid: '5511999999999@s.whatsapp.net',
        count: 20,
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });
  });

  describe('listInstances', () => {
    it('should list all instances', async () => {
      const responseData = [
        { instanceName: 'instance-1', status: 'open' },
        { instanceName: 'instance-2', status: 'close' },
      ];
      mockFetch.mockResolvedValue(mockSuccessResponse(responseData));

      const result = await evolutionService.listInstances();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });
  });

  describe('restartInstance', () => {
    it('should restart instance', async () => {
      mockFetch.mockResolvedValue(
        mockSuccessResponse({ instanceName: 'test-instance', status: 'connecting' }),
      );

      const result = await evolutionService.restartInstance('test-instance');

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/instance/restart/test-instance',
        expect.objectContaining({ method: 'PUT' }),
      );
    });
  });
});
