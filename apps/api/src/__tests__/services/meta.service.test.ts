import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock environment variables
const originalEnv = process.env;

beforeEach(() => {
  process.env = {
    ...originalEnv,
    META_APP_ID: 'test-app-id',
    META_APP_SECRET: 'test-app-secret',
    META_WEBHOOK_VERIFY_TOKEN: 'test-verify-token',
  };
});

afterEach(() => {
  process.env = originalEnv;
  vi.clearAllMocks();
});

// Import after setting up mocks
import { metaService } from '../../services/meta.service';

describe('metaService', () => {
  describe('getLongLivedToken', () => {
    it('should exchange short-lived token for long-lived token', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            access_token: 'long-lived-token',
            expires_in: 5184000,
          }),
      });

      const result = await metaService.getLongLivedToken('short-token');

      expect(result.success).toBe(true);
      expect(result.data?.access_token).toBe('long-lived-token');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('fb_exchange_token=short-token'),
        expect.any(Object),
      );
    });

    it('should handle API error response', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            error: {
              message: 'Invalid token',
              type: 'OAuthException',
              code: 190,
              fbtrace_id: 'trace-123',
            },
          }),
      });

      const result = await metaService.getLongLivedToken('invalid-token');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(190);
    });
  });

  describe('getPages', () => {
    it('should fetch user pages', async () => {
      const mockPages = {
        data: [
          { id: 'page-1', name: 'My Page', access_token: 'page-token' },
          { id: 'page-2', name: 'Other Page', access_token: 'page-token-2' },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockPages),
      });

      const result = await metaService.getPages('user-token');

      expect(result.success).toBe(true);
      expect(result.data?.data).toHaveLength(2);
    });
  });

  describe('getPageInfo', () => {
    it('should fetch page information', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            id: 'page-123',
            name: 'Test Page',
            instagram_business_account: { id: 'ig-123' },
          }),
      });

      const result = await metaService.getPageInfo('page-123', 'page-token');

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('page-123');
      expect(result.data?.instagram_business_account?.id).toBe('ig-123');
    });
  });

  describe('subscribePageToWebhooks', () => {
    it('should subscribe page to webhooks', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true }),
      });

      const result = await metaService.subscribePageToWebhooks('page-123', 'page-token');

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/page-123/subscribed_apps'),
        expect.objectContaining({
          method: 'POST',
        }),
      );
    });
  });

  describe('Facebook Messenger', () => {
    describe('sendMessengerText', () => {
      it('should send text message', async () => {
        mockFetch.mockResolvedValueOnce({
          json: () =>
            Promise.resolve({
              recipient_id: 'user-123',
              message_id: 'mid.123',
            }),
        });

        const result = await metaService.sendMessengerText(
          'page-token',
          'user-123',
          'Hello!',
        );

        expect(result.success).toBe(true);
        expect(result.data?.message_id).toBe('mid.123');
      });

      it('should send message with custom messaging type', async () => {
        mockFetch.mockResolvedValueOnce({
          json: () =>
            Promise.resolve({
              recipient_id: 'user-123',
              message_id: 'mid.123',
            }),
        });

        await metaService.sendMessengerText(
          'page-token',
          'user-123',
          'Update message',
          'UPDATE',
        );

        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            body: expect.stringContaining('"messaging_type":"UPDATE"'),
          }),
        );
      });
    });

    describe('sendMessengerMedia', () => {
      it('should send image attachment', async () => {
        mockFetch.mockResolvedValueOnce({
          json: () =>
            Promise.resolve({
              recipient_id: 'user-123',
              message_id: 'mid.123',
            }),
        });

        const result = await metaService.sendMessengerMedia(
          'page-token',
          'user-123',
          'image',
          'https://example.com/image.jpg',
        );

        expect(result.success).toBe(true);
        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            body: expect.stringContaining('"type":"image"'),
          }),
        );
      });

      it('should send video attachment', async () => {
        mockFetch.mockResolvedValueOnce({
          json: () => Promise.resolve({ recipient_id: 'user-123', message_id: 'mid.456' }),
        });

        await metaService.sendMessengerMedia(
          'page-token',
          'user-123',
          'video',
          'https://example.com/video.mp4',
        );

        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            body: expect.stringContaining('"type":"video"'),
          }),
        );
      });
    });

    describe('getMessengerConversation', () => {
      it('should fetch conversation info', async () => {
        mockFetch.mockResolvedValueOnce({
          json: () =>
            Promise.resolve({
              id: 'conv-123',
              participants: { data: [{ id: 'user-1', name: 'User' }] },
            }),
        });

        const result = await metaService.getMessengerConversation('conv-123', 'page-token');

        expect(result.success).toBe(true);
        expect(result.data?.id).toBe('conv-123');
      });
    });

    describe('markMessengerSeen', () => {
      it('should mark message as seen', async () => {
        mockFetch.mockResolvedValueOnce({
          json: () => Promise.resolve({ success: true }),
        });

        const result = await metaService.markMessengerSeen('page-token', 'user-123');

        expect(result.success).toBe(true);
        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            body: expect.stringContaining('"sender_action":"mark_seen"'),
          }),
        );
      });
    });
  });

  describe('Instagram Direct', () => {
    describe('sendInstagramText', () => {
      it('should send text message via Instagram', async () => {
        mockFetch.mockResolvedValueOnce({
          json: () =>
            Promise.resolve({
              recipient_id: 'ig-user-123',
              message_id: 'mid.ig.123',
            }),
        });

        const result = await metaService.sendInstagramText(
          'ig-123',
          'page-token',
          'ig-user-123',
          'Hello from Instagram!',
        );

        expect(result.success).toBe(true);
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/ig-123/messages'),
          expect.any(Object),
        );
      });
    });

    describe('sendInstagramMedia', () => {
      it('should send media via Instagram', async () => {
        mockFetch.mockResolvedValueOnce({
          json: () =>
            Promise.resolve({
              recipient_id: 'ig-user-123',
              message_id: 'mid.ig.456',
            }),
        });

        const result = await metaService.sendInstagramMedia(
          'ig-123',
          'page-token',
          'ig-user-123',
          'image',
          'https://example.com/photo.jpg',
        );

        expect(result.success).toBe(true);
      });
    });

    describe('getInstagramConversation', () => {
      it('should fetch Instagram conversation', async () => {
        mockFetch.mockResolvedValueOnce({
          json: () =>
            Promise.resolve({
              id: 'ig-conv-123',
              participants: { data: [{ id: 'ig-user-1' }] },
            }),
        });

        const result = await metaService.getInstagramConversation('ig-conv-123', 'page-token');

        expect(result.success).toBe(true);
        expect(result.data?.id).toBe('ig-conv-123');
      });
    });

    describe('getInstagramProfile', () => {
      it('should fetch Instagram user profile', async () => {
        mockFetch.mockResolvedValueOnce({
          json: () =>
            Promise.resolve({
              id: 'ig-user-123',
              username: 'testuser',
              name: 'Test User',
              profile_picture_url: 'https://example.com/pic.jpg',
            }),
        });

        const result = await metaService.getInstagramProfile('ig-user-123', 'page-token');

        expect(result.success).toBe(true);
        expect(result.data?.username).toBe('testuser');
      });
    });
  });

  describe('Webhooks', () => {
    describe('verifyWebhook', () => {
      it('should verify valid webhook subscription', () => {
        const result = metaService.verifyWebhook(
          'subscribe',
          'test-verify-token',
          'challenge-string',
        );

        expect(result).toBe('challenge-string');
      });

      it('should reject invalid token', () => {
        const result = metaService.verifyWebhook(
          'subscribe',
          'wrong-token',
          'challenge-string',
        );

        expect(result).toBeNull();
      });

      it('should reject invalid mode', () => {
        const result = metaService.verifyWebhook(
          'unsubscribe',
          'test-verify-token',
          'challenge-string',
        );

        expect(result).toBeNull();
      });
    });

    describe('parseWebhookEvent', () => {
      it('should parse Messenger message event', () => {
        const payload = {
          object: 'page',
          entry: [
            {
              id: 'page-123',
              time: 1234567890,
              messaging: [
                {
                  sender: { id: 'user-123' },
                  recipient: { id: 'page-123' },
                  timestamp: 1234567890,
                  message: {
                    mid: 'mid.123',
                    text: 'Hello!',
                  },
                },
              ],
            },
          ],
        };

        const result = metaService.parseWebhookEvent(payload);

        expect(result).not.toBeNull();
        expect(result?.platform).toBe('messenger');
        expect(result?.events).toHaveLength(1);
        expect(result?.events[0].type).toBe('message');
        expect(result?.events[0].message?.text).toBe('Hello!');
      });

      it('should parse Instagram message event', () => {
        const payload = {
          object: 'instagram',
          entry: [
            {
              id: 'ig-123',
              time: 1234567890,
              messaging: [
                {
                  sender: { id: 'ig-user-123' },
                  recipient: { id: 'ig-page-123' },
                  timestamp: 1234567890,
                  message: {
                    mid: 'mid.ig.123',
                    text: 'Hello from IG!',
                  },
                },
              ],
            },
          ],
        };

        const result = metaService.parseWebhookEvent(payload);

        expect(result?.platform).toBe('instagram');
      });

      it('should parse delivery event', () => {
        const payload = {
          object: 'page',
          entry: [
            {
              id: 'page-123',
              time: 1234567890,
              messaging: [
                {
                  sender: { id: 'user-123' },
                  recipient: { id: 'page-123' },
                  timestamp: 1234567890,
                  delivery: {
                    mids: ['mid.123'],
                    watermark: 1234567890,
                  },
                },
              ],
            },
          ],
        };

        const result = metaService.parseWebhookEvent(payload);

        expect(result?.events[0].type).toBe('delivery');
        expect(result?.events[0].delivery?.mids).toContain('mid.123');
      });

      it('should parse read event', () => {
        const payload = {
          object: 'page',
          entry: [
            {
              id: 'page-123',
              time: 1234567890,
              messaging: [
                {
                  sender: { id: 'user-123' },
                  recipient: { id: 'page-123' },
                  timestamp: 1234567890,
                  read: {
                    watermark: 1234567890,
                  },
                },
              ],
            },
          ],
        };

        const result = metaService.parseWebhookEvent(payload);

        expect(result?.events[0].type).toBe('read');
      });

      it('should parse postback event', () => {
        const payload = {
          object: 'page',
          entry: [
            {
              id: 'page-123',
              time: 1234567890,
              messaging: [
                {
                  sender: { id: 'user-123' },
                  recipient: { id: 'page-123' },
                  timestamp: 1234567890,
                  postback: {
                    title: 'Button Clicked',
                    payload: 'BUTTON_PAYLOAD',
                  },
                },
              ],
            },
          ],
        };

        const result = metaService.parseWebhookEvent(payload);

        expect(result?.events[0].type).toBe('postback');
        expect(result?.events[0].postback?.payload).toBe('BUTTON_PAYLOAD');
      });

      it('should parse message with attachments', () => {
        const payload = {
          object: 'page',
          entry: [
            {
              id: 'page-123',
              time: 1234567890,
              messaging: [
                {
                  sender: { id: 'user-123' },
                  recipient: { id: 'page-123' },
                  timestamp: 1234567890,
                  message: {
                    mid: 'mid.123',
                    attachments: [
                      {
                        type: 'image',
                        payload: { url: 'https://example.com/image.jpg' },
                      },
                    ],
                  },
                },
              ],
            },
          ],
        };

        const result = metaService.parseWebhookEvent(payload);

        expect(result?.events[0].message?.attachments).toHaveLength(1);
        expect(result?.events[0].message?.attachments?.[0].type).toBe('image');
      });

      it('should handle multiple events in one entry', () => {
        const payload = {
          object: 'page',
          entry: [
            {
              id: 'page-123',
              time: 1234567890,
              messaging: [
                {
                  sender: { id: 'user-1' },
                  recipient: { id: 'page-123' },
                  timestamp: 1234567890,
                  message: { mid: 'mid.1', text: 'First' },
                },
                {
                  sender: { id: 'user-2' },
                  recipient: { id: 'page-123' },
                  timestamp: 1234567891,
                  message: { mid: 'mid.2', text: 'Second' },
                },
              ],
            },
          ],
        };

        const result = metaService.parseWebhookEvent(payload);

        expect(result?.events).toHaveLength(2);
      });

      it('should return null for invalid payload', () => {
        const result = metaService.parseWebhookEvent(null);
        expect(result).toBeNull();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await metaService.getPages('token');

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('NetworkError');
    });

    it('should handle non-Error throws', async () => {
      mockFetch.mockRejectedValueOnce('String error');

      const result = await metaService.getPages('token');

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Request failed');
    });
  });
});
