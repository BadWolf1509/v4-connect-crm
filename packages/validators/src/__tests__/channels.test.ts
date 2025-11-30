import { describe, expect, it } from 'vitest';
import {
  channelTypeSchema,
  whatsappProviderSchema,
  connectWhatsAppSchema,
  connectMetaChannelSchema,
  createCampaignSchema,
} from '../index';

describe('Channel Schemas', () => {
  const validUuid = '550e8400-e29b-41d4-a716-446655440000';

  describe('channelTypeSchema', () => {
    const validTypes = ['whatsapp', 'instagram', 'messenger', 'email'];

    it('should accept all valid channel types', () => {
      for (const type of validTypes) {
        expect(channelTypeSchema.parse(type)).toBe(type);
      }
    });

    it('should reject invalid channel types', () => {
      expect(() => channelTypeSchema.parse('telegram')).toThrow();
      expect(() => channelTypeSchema.parse('sms')).toThrow();
      expect(() => channelTypeSchema.parse('WHATSAPP')).toThrow();
    });
  });

  describe('whatsappProviderSchema', () => {
    it('should accept evolution provider', () => {
      expect(whatsappProviderSchema.parse('evolution')).toBe('evolution');
    });

    it('should accept 360dialog provider', () => {
      expect(whatsappProviderSchema.parse('360dialog')).toBe('360dialog');
    });

    it('should reject invalid providers', () => {
      expect(() => whatsappProviderSchema.parse('twilio')).toThrow();
      expect(() => whatsappProviderSchema.parse('meta')).toThrow();
    });
  });

  describe('connectWhatsAppSchema', () => {
    it('should accept valid Evolution API connection', () => {
      const result = connectWhatsAppSchema.parse({
        name: 'WhatsApp Principal',
        provider: 'evolution',
        config: {
          instanceName: 'v4-connect-main',
        },
      });
      expect(result.name).toBe('WhatsApp Principal');
      expect(result.provider).toBe('evolution');
      expect(result.config.instanceName).toBe('v4-connect-main');
    });

    it('should accept valid 360dialog connection', () => {
      const result = connectWhatsAppSchema.parse({
        name: 'WhatsApp Business',
        provider: '360dialog',
        config: {
          apiKey: 'api-key-123',
          phoneNumber: '+5511999999999',
        },
      });
      expect(result.provider).toBe('360dialog');
      expect(result.config.apiKey).toBe('api-key-123');
    });

    it('should reject empty name', () => {
      expect(() =>
        connectWhatsAppSchema.parse({
          name: '',
          provider: 'evolution',
          config: {},
        }),
      ).toThrow('Nome é obrigatório');
    });

    it('should reject invalid provider', () => {
      expect(() =>
        connectWhatsAppSchema.parse({
          name: 'WhatsApp',
          provider: 'invalid',
          config: {},
        }),
      ).toThrow();
    });

    it('should accept empty config object', () => {
      const result = connectWhatsAppSchema.parse({
        name: 'WhatsApp',
        provider: 'evolution',
        config: {},
      });
      expect(result.config).toEqual({});
    });

    it('should accept all config fields together', () => {
      const result = connectWhatsAppSchema.parse({
        name: 'WhatsApp',
        provider: 'evolution',
        config: {
          instanceName: 'instance',
          apiKey: 'key',
          phoneNumber: '+55999999999',
        },
      });
      expect(result.config.instanceName).toBe('instance');
      expect(result.config.apiKey).toBe('key');
      expect(result.config.phoneNumber).toBe('+55999999999');
    });
  });

  describe('connectMetaChannelSchema', () => {
    it('should accept valid Instagram connection', () => {
      const result = connectMetaChannelSchema.parse({
        type: 'instagram',
        name: 'Instagram Loja',
        accessToken: 'EAABxyz123...',
        pageId: '123456789',
      });
      expect(result.type).toBe('instagram');
      expect(result.name).toBe('Instagram Loja');
      expect(result.accessToken).toBe('EAABxyz123...');
      expect(result.pageId).toBe('123456789');
    });

    it('should accept valid Messenger connection', () => {
      const result = connectMetaChannelSchema.parse({
        type: 'messenger',
        name: 'Facebook Page',
        accessToken: 'EAABabc456...',
        pageId: '987654321',
      });
      expect(result.type).toBe('messenger');
    });

    it('should reject invalid type', () => {
      expect(() =>
        connectMetaChannelSchema.parse({
          type: 'whatsapp',
          name: 'WhatsApp',
          accessToken: 'token',
          pageId: '123',
        }),
      ).toThrow();
    });

    it('should reject empty name', () => {
      expect(() =>
        connectMetaChannelSchema.parse({
          type: 'instagram',
          name: '',
          accessToken: 'token',
          pageId: '123',
        }),
      ).toThrow('Nome é obrigatório');
    });

    it('should reject empty accessToken', () => {
      expect(() =>
        connectMetaChannelSchema.parse({
          type: 'instagram',
          name: 'Instagram',
          accessToken: '',
          pageId: '123',
        }),
      ).toThrow('Access token é obrigatório');
    });

    it('should reject empty pageId', () => {
      expect(() =>
        connectMetaChannelSchema.parse({
          type: 'instagram',
          name: 'Instagram',
          accessToken: 'token',
          pageId: '',
        }),
      ).toThrow('Page ID é obrigatório');
    });
  });

  describe('createCampaignSchema', () => {
    it('should accept valid campaign with required fields', () => {
      const result = createCampaignSchema.parse({
        name: 'Black Friday',
        channelId: validUuid,
      });
      expect(result.name).toBe('Black Friday');
      expect(result.channelId).toBe(validUuid);
    });

    it('should accept campaign with template', () => {
      const result = createCampaignSchema.parse({
        name: 'Welcome Campaign',
        channelId: validUuid,
        templateId: validUuid,
      });
      expect(result.templateId).toBe(validUuid);
    });

    it('should accept campaign with content', () => {
      const result = createCampaignSchema.parse({
        name: 'Promo',
        channelId: validUuid,
        content: 'Check out our new products!',
      });
      expect(result.content).toBe('Check out our new products!');
    });

    it('should accept scheduled campaign', () => {
      const result = createCampaignSchema.parse({
        name: 'Scheduled',
        channelId: validUuid,
        scheduledAt: '2024-12-25T10:00:00Z',
      });
      expect(result.scheduledAt).toBeInstanceOf(Date);
    });

    it('should accept campaign with contactIds', () => {
      const result = createCampaignSchema.parse({
        name: 'Targeted',
        channelId: validUuid,
        contactIds: [validUuid, validUuid],
      });
      expect(result.contactIds).toHaveLength(2);
    });

    it('should accept campaign with filters', () => {
      const result = createCampaignSchema.parse({
        name: 'Filtered',
        channelId: validUuid,
        filters: {
          tags: ['vip', 'active'],
          lastContactDays: 30,
        },
      });
      expect(result.filters?.tags).toEqual(['vip', 'active']);
      expect(result.filters?.lastContactDays).toBe(30);
    });

    it('should reject empty name', () => {
      expect(() =>
        createCampaignSchema.parse({
          name: '',
          channelId: validUuid,
        }),
      ).toThrow('Nome é obrigatório');
    });

    it('should reject invalid channelId', () => {
      expect(() =>
        createCampaignSchema.parse({
          name: 'Campaign',
          channelId: 'not-a-uuid',
        }),
      ).toThrow();
    });

    it('should reject negative lastContactDays', () => {
      expect(() =>
        createCampaignSchema.parse({
          name: 'Campaign',
          channelId: validUuid,
          filters: {
            lastContactDays: -1,
          },
        }),
      ).toThrow();
    });

    it('should reject zero lastContactDays', () => {
      expect(() =>
        createCampaignSchema.parse({
          name: 'Campaign',
          channelId: validUuid,
          filters: {
            lastContactDays: 0,
          },
        }),
      ).toThrow();
    });
  });
});
