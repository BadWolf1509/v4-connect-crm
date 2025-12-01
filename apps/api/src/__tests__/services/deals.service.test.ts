import { describe, expect, it } from 'vitest';
import { buildReorderedStages } from '../../services/deals.service';

describe('buildReorderedStages', () => {
  it('keeps ordering contiguous when moving inside the same stage and appending by default', () => {
    const { target, source } = buildReorderedStages({
      dealId: 'deal-b',
      sourceStageId: 'stage-1',
      targetStageId: 'stage-1',
      sourceDeals: [{ id: 'deal-a' }, { id: 'deal-b' }, { id: 'deal-c' }],
      targetDeals: [],
    });

    expect(target).toEqual([
      { id: 'deal-a', order: 0 },
      { id: 'deal-c', order: 1 },
      { id: 'deal-b', order: 2 },
    ]);
    expect(source).toEqual(target);
  });

  it('places the deal at the requested index inside the same stage', () => {
    const { target } = buildReorderedStages({
      dealId: 'deal-c',
      sourceStageId: 'stage-1',
      targetStageId: 'stage-1',
      targetOrder: 0,
      sourceDeals: [{ id: 'deal-a' }, { id: 'deal-b' }, { id: 'deal-c' }],
      targetDeals: [],
    });

    expect(target).toEqual([
      { id: 'deal-c', order: 0 },
      { id: 'deal-a', order: 1 },
      { id: 'deal-b', order: 2 },
    ]);
  });

  it('rebuilds source and target stages when moving across stages with a clamped order', () => {
    const { source, target } = buildReorderedStages({
      dealId: 'deal-a',
      sourceStageId: 'stage-1',
      targetStageId: 'stage-2',
      targetOrder: 10, // greater than list length should append
      sourceDeals: [{ id: 'deal-a' }, { id: 'deal-b' }],
      targetDeals: [{ id: 'deal-x' }, { id: 'deal-y' }],
    });

    expect(source).toEqual([{ id: 'deal-b', order: 0 }]);
    expect(target).toEqual([
      { id: 'deal-x', order: 0 },
      { id: 'deal-y', order: 1 },
      { id: 'deal-a', order: 2 },
    ]);
  });
});
