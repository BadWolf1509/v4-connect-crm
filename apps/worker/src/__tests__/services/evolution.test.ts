import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { evolutionService } from '../../services/evolution.service';

describe('Evolution Service', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const mockSuccessResponse = (data: unknown) => ({
    ok: true,
    json: () => Promise.resolve(data),
  });

  const mockErrorResponse = (status: number, error: unknown) => ({
    ok: false,
    status,
    json: () => Promise.resolve(error),
  });

  describe('sendText', () => {
    it('should send text message successfully', async () => {
      const responseData = {
        key: {
          remoteJid: '5511999999999@s.whatsapp.net',
          fromMe: true,
          id: 'msg-123',
        },
        message: { conversation: 'Hello!' },
        status: 'sent',
      };

      mockFetch.mockResolvedValue(mockSuccessResponse(responseData));

      const result = await evolutionService.sendText('test-instance', {
        number: '5511999999999',
        text: 'Hello!',
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(responseData);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/message/sendText/test-instance'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            apikey: expect.any(String),
          }),
          body: JSON.stringify({ number: '5511999999999', text: 'Hello!' }),
        }),
      );
    });

    it('should handle API error', async () => {
      mockFetch.mockResolvedValue(
        mockErrorResponse(400, { message: 'Invalid number' }),
      );

      const result = await evolutionService.sendText('test-instance', {
        number: 'invalid',
        text: 'Hello!',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid number');
    });

    it('should handle network error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await evolutionService.sendText('test-instance', {
        number: '5511999999999',
        text: 'Hello!',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('sendMedia', () => {
    it('should send media successfully', async () => {
      const responseData = {
        key: { remoteJid: '5511999999999@s.whatsapp.net', fromMe: true, id: 'msg-123' },
        message: {},
        status: 'sent',
      };

      mockFetch.mockResolvedValue(mockSuccessResponse(responseData));

      const result = await evolutionService.sendMedia('test-instance', {
        number: '5511999999999',
        mediatype: 'image',
        mimetype: 'image/jpeg',
        media: 'https://example.com/image.jpg',
        caption: 'Check this out!',
      });

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/message/sendMedia/test-instance'),
        expect.objectContaining({
          method: 'POST',
        }),
      );
    });
  });

  describe('sendImage', () => {
    it('should send image with caption', async () => {
      const responseData = {
        key: { remoteJid: '5511999999999@s.whatsapp.net', fromMe: true, id: 'msg-123' },
        message: {},
        status: 'sent',
      };

      mockFetch.mockResolvedValue(mockSuccessResponse(responseData));

      const result = await evolutionService.sendImage('test-instance', {
        number: '5511999999999',
        image: 'https://example.com/photo.jpg',
        caption: 'My photo',
      });

      expect(result.success).toBe(true);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.mediatype).toBe('image');
      expect(callBody.media).toBe('https://example.com/photo.jpg');
      expect(callBody.caption).toBe('My photo');
    });

    it('should send image without caption', async () => {
      mockFetch.mockResolvedValue(
        mockSuccessResponse({ key: {}, message: {}, status: 'sent' }),
      );

      const result = await evolutionService.sendImage('test-instance', {
        number: '5511999999999',
        image: 'https://example.com/photo.jpg',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('sendAudio', () => {
    it('should send audio message', async () => {
      const responseData = {
        key: { remoteJid: '5511999999999@s.whatsapp.net', fromMe: true, id: 'msg-123' },
        message: {},
        status: 'sent',
      };

      mockFetch.mockResolvedValue(mockSuccessResponse(responseData));

      const result = await evolutionService.sendAudio('test-instance', {
        number: '5511999999999',
        audio: 'https://example.com/audio.ogg',
      });

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/message/sendWhatsAppAudio/test-instance'),
        expect.any(Object),
      );
    });
  });

  describe('sendDocument', () => {
    it('should send document with filename', async () => {
      const responseData = {
        key: { remoteJid: '5511999999999@s.whatsapp.net', fromMe: true, id: 'msg-123' },
        message: {},
        status: 'sent',
      };

      mockFetch.mockResolvedValue(mockSuccessResponse(responseData));

      const result = await evolutionService.sendDocument('test-instance', {
        number: '5511999999999',
        document: 'https://example.com/contract.pdf',
        fileName: 'contract.pdf',
        mimetype: 'application/pdf',
      });

      expect(result.success).toBe(true);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.mediatype).toBe('document');
      expect(callBody.fileName).toBe('contract.pdf');
      expect(callBody.mimetype).toBe('application/pdf');
    });
  });

  describe('Error Handling', () => {
    it('should handle error response with error field', async () => {
      mockFetch.mockResolvedValue(
        mockErrorResponse(500, { error: 'Server error' }),
      );

      const result = await evolutionService.sendText('test-instance', {
        number: '5511999999999',
        text: 'Hello!',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Server error');
    });

    it('should handle error response without message', async () => {
      mockFetch.mockResolvedValue(mockErrorResponse(500, {}));

      const result = await evolutionService.sendText('test-instance', {
        number: '5511999999999',
        text: 'Hello!',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Request failed');
    });

    it('should handle non-Error thrown', async () => {
      mockFetch.mockRejectedValue('Unknown error');

      const result = await evolutionService.sendText('test-instance', {
        number: '5511999999999',
        text: 'Hello!',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Request failed');
    });
  });
});
