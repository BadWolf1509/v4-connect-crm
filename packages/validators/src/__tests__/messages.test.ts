import { describe, expect, it } from 'vitest';
import {
  messageTypeSchema,
  sendMessageSchema,
  conversationStatusSchema,
  updateConversationSchema,
  assignConversationSchema,
} from '../index';

describe('Message Schemas', () => {
  describe('messageTypeSchema', () => {
    const validTypes = [
      'text',
      'image',
      'video',
      'audio',
      'document',
      'location',
      'contact',
      'sticker',
      'template',
    ];

    it('should accept all valid message types', () => {
      for (const type of validTypes) {
        expect(messageTypeSchema.parse(type)).toBe(type);
      }
    });

    it('should reject invalid message types', () => {
      expect(() => messageTypeSchema.parse('invalid')).toThrow();
      expect(() => messageTypeSchema.parse('TEXT')).toThrow();
      expect(() => messageTypeSchema.parse('')).toThrow();
    });
  });

  describe('sendMessageSchema', () => {
    const validUuid = '550e8400-e29b-41d4-a716-446655440000';

    it('should accept valid text message', () => {
      const result = sendMessageSchema.parse({
        conversationId: validUuid,
        content: 'Hello, world!',
      });
      expect(result.conversationId).toBe(validUuid);
      expect(result.type).toBe('text');
      expect(result.content).toBe('Hello, world!');
    });

    it('should accept message with explicit type', () => {
      const result = sendMessageSchema.parse({
        conversationId: validUuid,
        type: 'image',
        content: 'Check this image',
        metadata: {
          mediaUrl: 'https://example.com/image.jpg',
          mimeType: 'image/jpeg',
        },
      });
      expect(result.type).toBe('image');
      expect(result.metadata?.mediaUrl).toBe('https://example.com/image.jpg');
    });

    it('should accept message with location metadata', () => {
      const result = sendMessageSchema.parse({
        conversationId: validUuid,
        type: 'location',
        content: 'My location',
        metadata: {
          latitude: -23.5505,
          longitude: -46.6333,
        },
      });
      expect(result.metadata?.latitude).toBe(-23.5505);
      expect(result.metadata?.longitude).toBe(-46.6333);
    });

    it('should accept message with template metadata', () => {
      const result = sendMessageSchema.parse({
        conversationId: validUuid,
        type: 'template',
        content: 'Template message',
        metadata: {
          templateName: 'welcome_message',
          templateParams: ['John', 'Order #123'],
        },
      });
      expect(result.metadata?.templateName).toBe('welcome_message');
      expect(result.metadata?.templateParams).toEqual(['John', 'Order #123']);
    });

    it('should reject empty content', () => {
      expect(() =>
        sendMessageSchema.parse({
          conversationId: validUuid,
          content: '',
        }),
      ).toThrow('Mensagem não pode estar vazia');
    });

    it('should reject invalid conversationId', () => {
      expect(() =>
        sendMessageSchema.parse({
          conversationId: 'not-a-uuid',
          content: 'Hello',
        }),
      ).toThrow();
    });

    it('should reject invalid mediaUrl', () => {
      expect(() =>
        sendMessageSchema.parse({
          conversationId: validUuid,
          content: 'Hello',
          metadata: {
            mediaUrl: 'not-a-url',
          },
        }),
      ).toThrow();
    });

    it('should accept document with fileName', () => {
      const result = sendMessageSchema.parse({
        conversationId: validUuid,
        type: 'document',
        content: 'Document attached',
        metadata: {
          mediaUrl: 'https://example.com/doc.pdf',
          mimeType: 'application/pdf',
          fileName: 'contract.pdf',
        },
      });
      expect(result.metadata?.fileName).toBe('contract.pdf');
    });
  });

  describe('conversationStatusSchema', () => {
    const validStatuses = ['pending', 'open', 'resolved', 'snoozed'];

    it('should accept all valid statuses', () => {
      for (const status of validStatuses) {
        expect(conversationStatusSchema.parse(status)).toBe(status);
      }
    });

    it('should reject invalid statuses', () => {
      expect(() => conversationStatusSchema.parse('closed')).toThrow();
      expect(() => conversationStatusSchema.parse('OPEN')).toThrow();
    });
  });

  describe('updateConversationSchema', () => {
    const validUuid = '550e8400-e29b-41d4-a716-446655440000';

    it('should accept status update', () => {
      const result = updateConversationSchema.parse({
        status: 'resolved',
      });
      expect(result.status).toBe('resolved');
    });

    it('should accept assignee update', () => {
      const result = updateConversationSchema.parse({
        assigneeId: validUuid,
      });
      expect(result.assigneeId).toBe(validUuid);
    });

    it('should accept null assigneeId (unassign)', () => {
      const result = updateConversationSchema.parse({
        assigneeId: null,
      });
      expect(result.assigneeId).toBeNull();
    });

    it('should accept team update', () => {
      const result = updateConversationSchema.parse({
        teamId: validUuid,
      });
      expect(result.teamId).toBe(validUuid);
    });

    it('should accept empty update', () => {
      const result = updateConversationSchema.parse({});
      expect(result).toEqual({});
    });

    it('should reject invalid status', () => {
      expect(() =>
        updateConversationSchema.parse({
          status: 'invalid',
        }),
      ).toThrow();
    });
  });

  describe('assignConversationSchema', () => {
    const validUuid = '550e8400-e29b-41d4-a716-446655440000';

    it('should accept valid assignment', () => {
      const result = assignConversationSchema.parse({
        assigneeId: validUuid,
      });
      expect(result.assigneeId).toBe(validUuid);
    });

    it('should accept null assigneeId (unassign)', () => {
      const result = assignConversationSchema.parse({
        assigneeId: null,
      });
      expect(result.assigneeId).toBeNull();
    });

    it('should accept assignment with teamId', () => {
      const result = assignConversationSchema.parse({
        assigneeId: validUuid,
        teamId: validUuid,
      });
      expect(result.teamId).toBe(validUuid);
    });

    it('should reject invalid assigneeId', () => {
      expect(() =>
        assignConversationSchema.parse({
          assigneeId: 'not-a-uuid',
        }),
      ).toThrow();
    });
  });
});
