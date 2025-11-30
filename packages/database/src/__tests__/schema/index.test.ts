import { describe, expect, it } from 'vitest';
import * as schema from '../../schema';

describe('schema exports', () => {
  describe('tenants module', () => {
    it('should export tenants table', () => {
      expect(schema.tenants).toBeDefined();
    });

    it('should export planEnum', () => {
      expect(schema.planEnum).toBeDefined();
    });
  });

  describe('users module', () => {
    it('should export users table', () => {
      expect(schema.users).toBeDefined();
    });

    it('should export userRoleEnum', () => {
      expect(schema.userRoleEnum).toBeDefined();
    });

    it('should export usersRelations', () => {
      expect(schema.usersRelations).toBeDefined();
    });
  });

  describe('teams module', () => {
    it('should export teams table', () => {
      expect(schema.teams).toBeDefined();
    });

    it('should export userTeams table', () => {
      expect(schema.userTeams).toBeDefined();
    });
  });

  describe('channels module', () => {
    it('should export channels table', () => {
      expect(schema.channels).toBeDefined();
    });

    it('should export channelTypeEnum', () => {
      expect(schema.channelTypeEnum).toBeDefined();
    });

    it('should export inboxes table', () => {
      expect(schema.inboxes).toBeDefined();
    });
  });

  describe('contacts module', () => {
    it('should export contacts table', () => {
      expect(schema.contacts).toBeDefined();
    });
  });

  describe('conversations module', () => {
    it('should export conversations table', () => {
      expect(schema.conversations).toBeDefined();
    });

    it('should export conversationStatusEnum', () => {
      expect(schema.conversationStatusEnum).toBeDefined();
    });

    it('should export conversationsRelations', () => {
      expect(schema.conversationsRelations).toBeDefined();
    });
  });

  describe('messages module', () => {
    it('should export messages table', () => {
      expect(schema.messages).toBeDefined();
    });

    it('should export attachments table', () => {
      expect(schema.attachments).toBeDefined();
    });

    it('should export message enums', () => {
      expect(schema.messageTypeEnum).toBeDefined();
      expect(schema.messageDirectionEnum).toBeDefined();
      expect(schema.messageStatusEnum).toBeDefined();
      expect(schema.senderTypeEnum).toBeDefined();
    });
  });

  describe('pipelines module', () => {
    it('should export pipelines table', () => {
      expect(schema.pipelines).toBeDefined();
    });
  });

  describe('deals module', () => {
    it('should export deals table', () => {
      expect(schema.deals).toBeDefined();
    });

    it('should export dealStatusEnum', () => {
      expect(schema.dealStatusEnum).toBeDefined();
    });
  });

  describe('campaigns module', () => {
    it('should export campaigns table', () => {
      expect(schema.campaigns).toBeDefined();
    });

    it('should export campaignStatusEnum', () => {
      expect(schema.campaignStatusEnum).toBeDefined();
    });
  });

  describe('chatbots module', () => {
    it('should export chatbots table', () => {
      expect(schema.chatbots).toBeDefined();
    });

    it('should export flowNodes table', () => {
      expect(schema.flowNodes).toBeDefined();
    });

    it('should export flowEdges table', () => {
      expect(schema.flowEdges).toBeDefined();
    });
  });

  describe('core tables are properly defined', () => {
    const coreTables = [
      'tenants',
      'users',
      'teams',
      'userTeams',
      'channels',
      'inboxes',
      'contacts',
      'conversations',
      'messages',
      'attachments',
      'pipelines',
      'deals',
      'campaigns',
      'chatbots',
      'flowNodes',
      'flowEdges',
    ];

    for (const tableName of coreTables) {
      it(`should export ${tableName}`, () => {
        const table = schema[tableName as keyof typeof schema];
        expect(table).toBeDefined();
      });
    }
  });

  describe('enum completeness', () => {
    it('planEnum should have expected values', () => {
      expect(schema.planEnum.enumValues).toEqual(['free', 'starter', 'pro', 'enterprise']);
    });

    it('userRoleEnum should have expected values', () => {
      expect(schema.userRoleEnum.enumValues).toEqual(['owner', 'admin', 'agent']);
    });

    it('conversationStatusEnum should have expected values', () => {
      expect(schema.conversationStatusEnum.enumValues).toEqual([
        'pending',
        'open',
        'resolved',
        'snoozed',
      ]);
    });

    it('messageTypeEnum should support all message types', () => {
      const types = schema.messageTypeEnum.enumValues;
      expect(types).toContain('text');
      expect(types).toContain('image');
      expect(types).toContain('video');
      expect(types).toContain('audio');
      expect(types).toContain('document');
    });

    it('dealStatusEnum should have expected values', () => {
      expect(schema.dealStatusEnum.enumValues).toEqual(['open', 'won', 'lost']);
    });
  });
});
