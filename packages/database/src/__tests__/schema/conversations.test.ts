import { describe, expect, it } from 'vitest';
import {
  conversationStatusEnum,
  conversations,
  conversationsRelations,
  type Conversation,
  type NewConversation,
} from '../../schema/conversations';

describe('conversations schema', () => {
  describe('table definition', () => {
    it('should have id column', () => {
      expect(conversations.id).toBeDefined();
      expect(conversations.id.name).toBe('id');
    });

    it('should have tenantId as required foreign key', () => {
      expect(conversations.tenantId).toBeDefined();
      expect(conversations.tenantId.name).toBe('tenant_id');
      expect(conversations.tenantId.notNull).toBe(true);
    });

    it('should have channelId as required foreign key', () => {
      expect(conversations.channelId).toBeDefined();
      expect(conversations.channelId.name).toBe('channel_id');
      expect(conversations.channelId.notNull).toBe(true);
    });

    it('should have inboxId as optional foreign key', () => {
      expect(conversations.inboxId).toBeDefined();
      expect(conversations.inboxId.name).toBe('inbox_id');
      expect(conversations.inboxId.notNull).toBe(false);
    });

    it('should have contactId as required foreign key', () => {
      expect(conversations.contactId).toBeDefined();
      expect(conversations.contactId.name).toBe('contact_id');
      expect(conversations.contactId.notNull).toBe(true);
    });

    it('should have assigneeId as optional foreign key', () => {
      expect(conversations.assigneeId).toBeDefined();
      expect(conversations.assigneeId.name).toBe('assignee_id');
      expect(conversations.assigneeId.notNull).toBe(false);
    });

    it('should have teamId as optional foreign key', () => {
      expect(conversations.teamId).toBeDefined();
      expect(conversations.teamId.name).toBe('team_id');
      expect(conversations.teamId.notNull).toBe(false);
    });

    it('should have status with default value', () => {
      expect(conversations.status).toBeDefined();
      expect(conversations.status.name).toBe('status');
      expect(conversations.status.notNull).toBe(true);
      expect(conversations.status.hasDefault).toBe(true);
    });

    it('should have optional timestamp fields', () => {
      expect(conversations.lastMessageAt.name).toBe('last_message_at');
      expect(conversations.lastMessageAt.notNull).toBe(false);
      expect(conversations.snoozedUntil.name).toBe('snoozed_until');
      expect(conversations.snoozedUntil.notNull).toBe(false);
    });

    it('should have metadata as jsonb with default', () => {
      expect(conversations.metadata).toBeDefined();
      expect(conversations.metadata.name).toBe('metadata');
      expect(conversations.metadata.notNull).toBe(true);
      expect(conversations.metadata.hasDefault).toBe(true);
    });

    it('should have required timestamp fields', () => {
      expect(conversations.createdAt.notNull).toBe(true);
      expect(conversations.updatedAt.notNull).toBe(true);
    });
  });

  describe('conversationStatusEnum', () => {
    it('should have all expected status types', () => {
      const values = conversationStatusEnum.enumValues;
      expect(values).toContain('pending');
      expect(values).toContain('open');
      expect(values).toContain('resolved');
      expect(values).toContain('snoozed');
      expect(values).toHaveLength(4);
    });
  });

  describe('relations', () => {
    it('should define relations', () => {
      expect(conversationsRelations).toBeDefined();
    });
  });

  describe('type inference', () => {
    it('should correctly type Conversation select type', () => {
      const conversation: Conversation = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        tenantId: '223e4567-e89b-12d3-a456-426614174000',
        channelId: '323e4567-e89b-12d3-a456-426614174000',
        inboxId: null,
        contactId: '423e4567-e89b-12d3-a456-426614174000',
        assigneeId: null,
        teamId: null,
        status: 'open',
        lastMessageAt: new Date(),
        snoozedUntil: null,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      expect(conversation).toBeDefined();
      expect(conversation.status).toBe('open');
    });

    it('should correctly type NewConversation insert type with minimal fields', () => {
      const newConversation: NewConversation = {
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        channelId: '223e4567-e89b-12d3-a456-426614174000',
        contactId: '323e4567-e89b-12d3-a456-426614174000',
      };
      expect(newConversation).toBeDefined();
      expect(newConversation.tenantId).toBe('123e4567-e89b-12d3-a456-426614174000');
    });

    it('should correctly type NewConversation insert type with all fields', () => {
      const fullConversation: NewConversation = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        tenantId: '223e4567-e89b-12d3-a456-426614174000',
        channelId: '323e4567-e89b-12d3-a456-426614174000',
        inboxId: '423e4567-e89b-12d3-a456-426614174000',
        contactId: '523e4567-e89b-12d3-a456-426614174000',
        assigneeId: '623e4567-e89b-12d3-a456-426614174000',
        teamId: '723e4567-e89b-12d3-a456-426614174000',
        status: 'resolved',
        lastMessageAt: new Date(),
        snoozedUntil: new Date(),
        metadata: { custom: 'data' },
      };
      expect(fullConversation).toBeDefined();
      expect(fullConversation.status).toBe('resolved');
    });
  });
});
