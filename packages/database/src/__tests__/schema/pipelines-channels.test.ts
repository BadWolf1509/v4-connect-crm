import { describe, expect, it } from 'vitest';
import { channels, channelTypeEnum, inboxes } from '../../schema/channels';
import { contacts } from '../../schema/contacts';
import { pipelines, stages } from '../../schema/pipelines';
import { quickReplies } from '../../schema/quick-replies';
import { tags, contactTags } from '../../schema/tags';
import { campaigns, campaignContacts, campaignStatusEnum } from '../../schema/campaigns';

describe('pipelines and channels schema', () => {
  it('defines pipeline and stages with ordering defaults', () => {
    expect(pipelines.name.notNull).toBe(true);
    expect(stages.order.hasDefault).toBe(true);
    expect(stages.pipelineId.notNull).toBe(true);
  });

  it('defines channel enum and inbox relationship', () => {
    expect(channelTypeEnum.enumValues).toContain('whatsapp');
    expect(channels.type.notNull).toBe(true);
    expect(inboxes.channelId.notNull).toBe(true);
  });

  it('contacts capture tenant relationship', () => {
    expect(contacts.tenantId.notNull).toBe(true);
    expect(contacts.phone.notNull).toBe(false);
  });
});

describe('knowledge base schema', () => {
  it('quick replies have defaults and category support', () => {
    expect(quickReplies.title.notNull).toBe(true);
    expect(quickReplies.category.hasDefault).toBe(true);
  });

  it('tags and contactTags link contacts to tags', () => {
    expect(tags.color.hasDefault).toBe(true);
    expect(contactTags.contactId.notNull).toBe(true);
  });
});

describe('campaign schema coverage', () => {
  it('campaign statuses include running and paused', () => {
    expect(campaignStatusEnum.enumValues).toEqual(
      expect.arrayContaining(['running', 'paused']),
    );
  });

  it('campaign contacts track status and errors', () => {
    expect(campaignContacts.status.hasDefault).toBe(true);
    expect(campaignContacts.errorMessage.notNull).toBe(false);
  });

  it('campaigns track scheduling and stats defaults', () => {
    expect(campaigns.scheduledAt.notNull).toBe(false);
    expect(campaigns.stats.hasDefault).toBe(true);
  });
});
