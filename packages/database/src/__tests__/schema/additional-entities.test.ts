import { describe, expect, it } from 'vitest';
import {
  activities,
  dealHistory,
  dealHistoryTypeEnum,
  deals,
  dealStatusEnum,
} from '../../schema/deals';
import {
  campaignContacts,
  campaigns,
  campaignStatusEnum,
} from '../../schema/campaigns';
import { invites, inviteStatusEnum } from '../../schema/invites';
import { quickReplies } from '../../schema/quick-replies';
import { contactTags, tags } from '../../schema/tags';

describe('deals schema', () => {
  it('defines deal status and history enums', () => {
    expect(dealStatusEnum.enumValues).toEqual(['open', 'won', 'lost']);
    expect(dealHistoryTypeEnum.enumValues).toContain('status_changed');
    expect(dealHistory.type.notNull).toBe(true);
  });

  it('marks monetary and ordering columns as optional defaults', () => {
    expect(deals.value.hasDefault).toBe(false);
    expect(deals.currency.hasDefault).toBe(true);
    expect(deals.order.hasDefault).toBe(true);
  });

  it('tracks activity metadata and timestamps', () => {
    expect(activities.type.notNull).toBe(true);
    expect(activities.dueAt.notNull).toBe(false);
    expect(activities.createdAt.hasDefault).toBe(true);
    expect(activities.updatedAt.hasDefault).toBe(true);
  });

  it('stores history payloads with defaults', () => {
    expect(dealHistory.previousValue.notNull).toBe(false);
    expect(dealHistory.metadata.hasDefault).toBe(true);
    expect(dealHistory.createdAt.hasDefault).toBe(true);
  });
});

describe('campaign schema', () => {
  it('exposes campaign statuses and default stats', () => {
    expect(campaignStatusEnum.enumValues).toContain('scheduled');
    expect(campaigns.status.hasDefault).toBe(true);
    expect(campaigns.stats.hasDefault).toBe(true);
  });

  it('links campaign contacts with progress tracking', () => {
    expect(campaignContacts.status.notNull).toBe(true);
    expect(campaignContacts.status.hasDefault).toBe(true);
    expect(campaignContacts.errorMessage.notNull).toBe(false);
  });
});

describe('quick replies schema', () => {
  it('requires core fields and defaults category', () => {
    expect(quickReplies.title.notNull).toBe(true);
    expect(quickReplies.content.notNull).toBe(true);
    expect(quickReplies.category.hasDefault).toBe(true);
    expect(quickReplies.shortcut.notNull).toBe(false);
  });
});

describe('tags schema', () => {
  it('stores tenant-scoped tags with color defaults', () => {
    expect(tags.name.notNull).toBe(true);
    expect(tags.color.hasDefault).toBe(true);
    expect(tags.tenantId.notNull).toBe(true);
  });

  it('links contacts to tags through pivot table', () => {
    expect(contactTags.contactId.notNull).toBe(true);
    expect(contactTags.tagId.notNull).toBe(true);
    expect(contactTags.createdAt.hasDefault).toBe(true);
  });
});

describe('invites schema', () => {
  it('enforces invite status and role defaults', () => {
    expect(inviteStatusEnum.enumValues).toContain('accepted');
    expect(invites.status.hasDefault).toBe(true);
    expect(invites.role.hasDefault).toBe(true);
  });

  it('tracks invitation lifecycle timestamps', () => {
    expect(invites.expiresAt.notNull).toBe(true);
    expect(invites.acceptedAt.notNull).toBe(false);
    expect(invites.createdAt.hasDefault).toBe(true);
    expect(invites.updatedAt.hasDefault).toBe(true);
  });
});
