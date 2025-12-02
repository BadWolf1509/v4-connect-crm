import { describe, expect, it } from 'vitest';
import {
  activities,
  activitiesRelations,
  dealHistory,
  dealHistoryRelations,
  dealHistoryTypeEnum,
  deals,
  dealsRelations,
  dealStatusEnum,
} from '../../schema/deals';

describe('deals schema coverage', () => {
  it('exposes deal enums and defaults', () => {
    expect(dealStatusEnum.enumValues).toEqual(['open', 'won', 'lost']);
    expect(deals.status.hasDefault).toBe(true);
    expect(deals.currency.hasDefault).toBe(true);
    expect(deals.order.hasDefault).toBe(true);
  });

  it('tracks history metadata and relations', () => {
    expect(dealHistoryTypeEnum.enumValues).toContain('note_added');
    expect(dealHistory.metadata.hasDefault).toBe(true);
    expect(dealHistory.createdAt.hasDefault).toBe(true);
    expect(dealHistoryRelations).toBeDefined();
  });

  it('defines activities links and timestamps', () => {
    expect(activities.title.notNull).toBe(true);
    expect(activities.createdAt.hasDefault).toBe(true);
    expect(activitiesRelations).toBeDefined();
  });

  it('sets up deal relations to pipeline and contact', () => {
    expect(dealsRelations).toBeDefined();
  });
});
