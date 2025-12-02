import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockCampaigns = [
  {
    id: 'campaign-1',
    tenantId: 'test-tenant',
    channelId: 'channel-1',
    name: 'Campaign 1',
    status: 'draft',
    content: 'Hello {{name}}',
    templateId: null,
    scheduledAt: null,
    startedAt: null,
    completedAt: null,
    stats: { total: 10, sent: 0, delivered: 0, read: 0, failed: 0 },
    createdAt: new Date(),
    channel: { id: 'channel-1', name: 'WhatsApp', type: 'whatsapp' },
  },
];

const mockCampaignContacts = [
  { id: 'contact-1', name: 'John Doe', phone: '+5511999999999', status: 'pending' },
  { id: 'contact-2', name: 'Jane Doe', phone: '+5511888888888', status: 'sent' },
];

const dbChains = {
  select: vi.fn(() => dbChains),
  from: vi.fn(() => dbChains),
  where: vi.fn(() => dbChains),
  leftJoin: vi.fn(() => dbChains),
  orderBy: vi.fn(() => dbChains),
  limit: vi.fn(() => dbChains),
  offset: vi.fn(async () => mockCampaigns),
  groupBy: vi.fn(async () => [
    { status: 'pending', count: 5 },
    { status: 'sent', count: 3 },
    { status: 'delivered', count: 2 },
  ]),
  insert: vi.fn(() => ({
    values: vi.fn(() => ({
      returning: vi.fn(async () => [mockCampaigns[0]]),
    })),
  })),
  update: vi.fn(() => ({
    set: vi.fn(() => ({
      where: vi.fn(() => ({
        returning: vi.fn(async () => [{ ...mockCampaigns[0], status: 'scheduled' }]),
      })),
    })),
  })),
  transaction: vi.fn(async (cb: (tx: typeof dbChains) => Promise<unknown>) => {
    return cb(dbChains);
  }),
};

vi.mock('../../lib/db', () => ({
  db: dbChains,
  schema: {
    campaigns: {
      id: 'id',
      tenantId: 'tenant_id',
      channelId: 'channel_id',
      name: 'name',
      status: 'status',
      content: 'content',
      templateId: 'template_id',
      scheduledAt: 'scheduled_at',
      startedAt: 'started_at',
      completedAt: 'completed_at',
      stats: 'stats',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
    campaignContacts: {
      id: 'id',
      campaignId: 'campaign_id',
      contactId: 'contact_id',
      status: 'status',
    },
    contacts: {
      id: 'id',
      name: 'name',
      phone: 'phone',
    },
    channels: {
      id: 'id',
      name: 'name',
      type: 'type',
    },
  },
}));

const { campaignsService } = await import('../../services/campaigns.service');

describe('Campaigns Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findAll', () => {
    it('returns campaigns with pagination', async () => {
      const result = await campaignsService.findAll({
        tenantId: 'test-tenant',
        page: 1,
        limit: 20,
      });

      expect(result.campaigns).toHaveLength(1);
      expect(result.pagination).toEqual({ page: 1, limit: 20 });
      expect(dbChains.select).toHaveBeenCalled();
      expect(dbChains.where).toHaveBeenCalled();
    });

    it('filters by status when provided', async () => {
      await campaignsService.findAll({
        tenantId: 'test-tenant',
        status: 'draft',
      });

      expect(dbChains.where).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    beforeEach(() => {
      // Reset chains for findById behavior
      dbChains.limit.mockImplementation(() => ({
        ...dbChains,
        then: (resolve: (value: unknown) => void) => resolve([mockCampaigns[0]]),
      }));
    });

    it('returns campaign with recipients', async () => {
      // Mock the limit to return campaign
      dbChains.limit.mockResolvedValueOnce([mockCampaigns[0]]);
      // Mock the second query for recipients
      dbChains.limit.mockResolvedValueOnce(mockCampaignContacts);

      const result = await campaignsService.findById('campaign-1', 'test-tenant');

      expect(result).not.toBeNull();
      expect(dbChains.select).toHaveBeenCalled();
    });

    it('returns null when campaign not found', async () => {
      dbChains.limit.mockResolvedValueOnce([]);

      const result = await campaignsService.findById('non-existent', 'test-tenant');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('creates campaign with contacts', async () => {
      const data = {
        tenantId: 'test-tenant',
        channelId: 'channel-1',
        name: 'New Campaign',
        content: 'Hello',
        contactIds: ['contact-1', 'contact-2'],
      };

      const result = await campaignsService.create(data);

      expect(result).not.toBeNull();
      expect(dbChains.transaction).toHaveBeenCalled();
    });

    it('sets status to scheduled when scheduledAt is provided', async () => {
      const scheduledAt = new Date();
      scheduledAt.setDate(scheduledAt.getDate() + 1);

      const data = {
        tenantId: 'test-tenant',
        channelId: 'channel-1',
        name: 'Scheduled Campaign',
        content: 'Hello',
        scheduledAt,
        contactIds: ['contact-1'],
      };

      await campaignsService.create(data);

      expect(dbChains.transaction).toHaveBeenCalled();
    });
  });

  describe('schedule', () => {
    it('updates campaign status to scheduled', async () => {
      dbChains.limit.mockResolvedValueOnce([{ ...mockCampaigns[0], status: 'scheduled' }]);

      const scheduledAt = new Date();
      const result = await campaignsService.schedule('campaign-1', 'test-tenant', scheduledAt);

      expect(dbChains.update).toHaveBeenCalled();
      expect(result).not.toBeNull();
    });
  });

  describe('updateStatus', () => {
    it('updates campaign status', async () => {
      const result = await campaignsService.updateStatus('campaign-1', 'test-tenant', 'running');

      expect(dbChains.update).toHaveBeenCalled();
      expect(result).not.toBeNull();
    });

    it('sets completedAt when status is cancelled or completed', async () => {
      await campaignsService.updateStatus('campaign-1', 'test-tenant', 'cancelled');

      expect(dbChains.update).toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('returns campaign stats with contact breakdown', async () => {
      dbChains.limit.mockResolvedValueOnce([mockCampaigns[0]]);

      const result = await campaignsService.getStats('campaign-1', 'test-tenant');

      expect(result).not.toBeNull();
      expect(result?.campaign).toBeDefined();
      expect(result?.stats).toBeDefined();
      expect(result?.contacts).toBeDefined();
    });

    it('returns null when campaign not found', async () => {
      dbChains.limit.mockResolvedValueOnce([]);

      const result = await campaignsService.getStats('non-existent', 'test-tenant');

      expect(result).toBeNull();
    });
  });
});
