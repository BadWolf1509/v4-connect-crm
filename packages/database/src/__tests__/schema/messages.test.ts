import { describe, expect, it } from 'vitest';
import {
  attachments,
  attachmentsRelations,
  messageDirectionEnum,
  messages,
  messagesRelations,
  messageStatusEnum,
  messageTypeEnum,
  senderTypeEnum,
  type Attachment,
  type Message,
  type NewAttachment,
  type NewMessage,
} from '../../schema/messages';

describe('messages schema', () => {
  describe('table definition', () => {
    it('should have id column', () => {
      expect(messages.id).toBeDefined();
      expect(messages.id.name).toBe('id');
    });

    it('should have tenantId as required foreign key', () => {
      expect(messages.tenantId).toBeDefined();
      expect(messages.tenantId.name).toBe('tenant_id');
      expect(messages.tenantId.notNull).toBe(true);
    });

    it('should have conversationId as required foreign key', () => {
      expect(messages.conversationId).toBeDefined();
      expect(messages.conversationId.name).toBe('conversation_id');
      expect(messages.conversationId.notNull).toBe(true);
    });

    it('should have senderId as optional foreign key', () => {
      expect(messages.senderId).toBeDefined();
      expect(messages.senderId.name).toBe('sender_id');
      expect(messages.senderId.notNull).toBe(false);
    });

    it('should have senderType with default', () => {
      expect(messages.senderType).toBeDefined();
      expect(messages.senderType.name).toBe('sender_type');
      expect(messages.senderType.notNull).toBe(true);
      expect(messages.senderType.hasDefault).toBe(true);
    });

    it('should have type with default', () => {
      expect(messages.type).toBeDefined();
      expect(messages.type.name).toBe('type');
      expect(messages.type.notNull).toBe(true);
      expect(messages.type.hasDefault).toBe(true);
    });

    it('should have direction with default', () => {
      expect(messages.direction).toBeDefined();
      expect(messages.direction.name).toBe('direction');
      expect(messages.direction.notNull).toBe(true);
      expect(messages.direction.hasDefault).toBe(true);
    });

    it('should have content as optional text', () => {
      expect(messages.content).toBeDefined();
      expect(messages.content.name).toBe('content');
      expect(messages.content.notNull).toBe(false);
    });

    it('should have media fields as optional', () => {
      expect(messages.mediaUrl.notNull).toBe(false);
      expect(messages.mediaType.notNull).toBe(false);
    });

    it('should have status with default', () => {
      expect(messages.status).toBeDefined();
      expect(messages.status.name).toBe('status');
      expect(messages.status.notNull).toBe(true);
      expect(messages.status.hasDefault).toBe(true);
    });

    it('should have externalId as optional', () => {
      expect(messages.externalId).toBeDefined();
      expect(messages.externalId.name).toBe('external_id');
      expect(messages.externalId.notNull).toBe(false);
    });

    it('should have deletedAt for soft delete', () => {
      expect(messages.deletedAt).toBeDefined();
      expect(messages.deletedAt.name).toBe('deleted_at');
      expect(messages.deletedAt.notNull).toBe(false);
    });
  });

  describe('messageTypeEnum', () => {
    it('should have all expected message types', () => {
      const values = messageTypeEnum.enumValues;
      expect(values).toContain('text');
      expect(values).toContain('image');
      expect(values).toContain('video');
      expect(values).toContain('audio');
      expect(values).toContain('document');
      expect(values).toContain('location');
      expect(values).toContain('contact');
      expect(values).toContain('sticker');
      expect(values).toContain('template');
      expect(values).toHaveLength(9);
    });
  });

  describe('messageDirectionEnum', () => {
    it('should have inbound and outbound', () => {
      const values = messageDirectionEnum.enumValues;
      expect(values).toContain('inbound');
      expect(values).toContain('outbound');
      expect(values).toHaveLength(2);
    });
  });

  describe('messageStatusEnum', () => {
    it('should have all expected status types', () => {
      const values = messageStatusEnum.enumValues;
      expect(values).toContain('pending');
      expect(values).toContain('sent');
      expect(values).toContain('delivered');
      expect(values).toContain('read');
      expect(values).toContain('failed');
      expect(values).toHaveLength(5);
    });
  });

  describe('senderTypeEnum', () => {
    it('should have all expected sender types', () => {
      const values = senderTypeEnum.enumValues;
      expect(values).toContain('user');
      expect(values).toContain('contact');
      expect(values).toContain('bot');
      expect(values).toHaveLength(3);
    });
  });

  describe('relations', () => {
    it('should define messages relations', () => {
      expect(messagesRelations).toBeDefined();
    });

    it('should define attachments relations', () => {
      expect(attachmentsRelations).toBeDefined();
    });
  });

  describe('type inference', () => {
    it('should correctly type Message select type', () => {
      const message: Message = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        tenantId: '223e4567-e89b-12d3-a456-426614174000',
        conversationId: '323e4567-e89b-12d3-a456-426614174000',
        senderId: null,
        senderType: 'contact',
        type: 'text',
        direction: 'inbound',
        content: 'Hello!',
        mediaUrl: null,
        mediaType: null,
        metadata: {},
        status: 'delivered',
        externalId: null,
        errorMessage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };
      expect(message).toBeDefined();
      expect(message.type).toBe('text');
    });

    it('should correctly type NewMessage insert type with minimal fields', () => {
      const newMessage: NewMessage = {
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        conversationId: '223e4567-e89b-12d3-a456-426614174000',
      };
      expect(newMessage).toBeDefined();
    });

    it('should correctly type NewMessage for media message', () => {
      const mediaMessage: NewMessage = {
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        conversationId: '223e4567-e89b-12d3-a456-426614174000',
        type: 'image',
        direction: 'outbound',
        mediaUrl: 'https://example.com/image.jpg',
        mediaType: 'image/jpeg',
        senderType: 'user',
        senderId: '423e4567-e89b-12d3-a456-426614174000',
      };
      expect(mediaMessage).toBeDefined();
      expect(mediaMessage.type).toBe('image');
    });
  });
});

describe('attachments schema', () => {
  describe('table definition', () => {
    it('should have id column', () => {
      expect(attachments.id).toBeDefined();
      expect(attachments.id.name).toBe('id');
    });

    it('should have messageId as required foreign key', () => {
      expect(attachments.messageId).toBeDefined();
      expect(attachments.messageId.name).toBe('message_id');
      expect(attachments.messageId.notNull).toBe(true);
    });

    it('should have required fields', () => {
      expect(attachments.type.notNull).toBe(true);
      expect(attachments.url.notNull).toBe(true);
    });

    it('should have optional fields', () => {
      expect(attachments.mimeType.notNull).toBe(false);
      expect(attachments.fileName.notNull).toBe(false);
      expect(attachments.fileSize.notNull).toBe(false);
      expect(attachments.thumbnail.notNull).toBe(false);
      expect(attachments.duration.notNull).toBe(false);
    });
  });

  describe('type inference', () => {
    it('should correctly type Attachment select type', () => {
      const attachment: Attachment = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        messageId: '223e4567-e89b-12d3-a456-426614174000',
        type: 'image',
        url: 'https://example.com/image.jpg',
        mimeType: 'image/jpeg',
        fileName: 'image.jpg',
        fileSize: '1024',
        thumbnail: null,
        duration: null,
        createdAt: new Date(),
      };
      expect(attachment).toBeDefined();
      expect(attachment.type).toBe('image');
    });

    it('should correctly type NewAttachment insert type', () => {
      const newAttachment: NewAttachment = {
        messageId: '123e4567-e89b-12d3-a456-426614174000',
        type: 'document',
        url: 'https://example.com/doc.pdf',
        mimeType: 'application/pdf',
        fileName: 'document.pdf',
        fileSize: '2048',
      };
      expect(newAttachment).toBeDefined();
      expect(newAttachment.type).toBe('document');
    });
  });
});
