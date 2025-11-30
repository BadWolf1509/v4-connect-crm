import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock db and schema
const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  groupBy: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  innerJoin: vi.fn().mockReturnThis(),
  leftJoin: vi.fn().mockReturnThis(),
};

vi.mock('../../lib/db', () => ({
  db: mockDb,
  schema: {
    conversations: {
      tenantId: 'tenant_id',
      status: 'status',
      createdAt: 'created_at',
      channelId: 'channel_id',
      contactId: 'contact_id',
      lastMessageAt: 'last_message_at',
      id: 'id',
    },
    messages: {
      tenantId: 'tenant_id',
    },
    contacts: {
      tenantId: 'tenant_id',
      id: 'id',
      name: 'name',
      phone: 'phone',
      avatarUrl: 'avatar_url',
    },
    channels: {
      tenantId: 'tenant_id',
      isActive: 'is_active',
      id: 'id',
      name: 'name',
      type: 'type',
    },
  },
}));

// Import after mocking
import { analyticsService } from '../../services/analytics.service';

describe('analyticsService', () => {
  const tenantId = 'tenant-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getOverview', () => {
    it('should return analytics overview with all metrics', async () => {
      // Mock each Promise.all call with specific counts
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockImplementation(() =>
        Promise.resolve([{ count: 100 }]),
      );

      const result = await analyticsService.getOverview(tenantId);

      expect(result).toEqual({
        totalConversations: 100,
        openConversations: 100,
        pendingConversations: 100,
        resolvedConversations: 100,
        totalContacts: 100,
        totalMessages: 100,
        activeChannels: 100,
      });
    });

    it('should return zeros when no data exists', async () => {
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockImplementation(() =>
        Promise.resolve([{ count: 0 }]),
      );

      const result = await analyticsService.getOverview(tenantId);

      expect(result.totalConversations).toBe(0);
      expect(result.totalContacts).toBe(0);
    });

    it('should handle empty results gracefully', async () => {
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockImplementation(() =>
        Promise.resolve([]),
      );

      const result = await analyticsService.getOverview(tenantId);

      expect(result.totalConversations).toBe(0);
    });
  });

  describe('getConversationsByStatus', () => {
    it('should return conversations grouped by status', async () => {
      const mockResult = [
        { status: 'open', count: 50 },
        { status: 'pending', count: 30 },
        { status: 'resolved', count: 20 },
      ];

      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.groupBy.mockResolvedValueOnce(mockResult);

      const result = await analyticsService.getConversationsByStatus(tenantId);

      expect(result).toEqual([
        { status: 'open', count: 50 },
        { status: 'pending', count: 30 },
        { status: 'resolved', count: 20 },
      ]);
    });

    it('should return empty array when no conversations', async () => {
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.groupBy.mockResolvedValueOnce([]);

      const result = await analyticsService.getConversationsByStatus(tenantId);

      expect(result).toEqual([]);
    });
  });

  describe('getConversationsByChannel', () => {
    it('should return conversations grouped by channel', async () => {
      const mockResult = [
        { channelId: 'channel-1', channelName: 'WhatsApp', channelType: 'whatsapp', count: 80 },
        { channelId: 'channel-2', channelName: 'Instagram', channelType: 'instagram', count: 20 },
      ];

      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.innerJoin.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.groupBy.mockResolvedValueOnce(mockResult);

      const result = await analyticsService.getConversationsByChannel(tenantId);

      expect(result).toEqual([
        { channelId: 'channel-1', channelName: 'WhatsApp', channelType: 'whatsapp', count: 80 },
        { channelId: 'channel-2', channelName: 'Instagram', channelType: 'instagram', count: 20 },
      ]);
    });
  });

  describe('getDailyConversations', () => {
    it('should return daily conversations for default 7 days', async () => {
      const mockResult = [
        { date: '2024-01-01', count: 10 },
        { date: '2024-01-02', count: 15 },
      ];

      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.groupBy.mockReturnThis();
      mockDb.orderBy.mockResolvedValueOnce(mockResult);

      const result = await analyticsService.getDailyConversations(tenantId);

      expect(result).toHaveLength(7);
      // All dates should be filled, missing ones with 0
      for (const day of result) {
        expect(day).toHaveProperty('date');
        expect(day).toHaveProperty('count');
        expect(typeof day.count).toBe('number');
      }
    });

    it('should return daily conversations for custom days', async () => {
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.groupBy.mockReturnThis();
      mockDb.orderBy.mockResolvedValueOnce([]);

      const result = await analyticsService.getDailyConversations(tenantId, 30);

      expect(result).toHaveLength(30);
    });

    it('should fill missing dates with zero count', async () => {
      // Only return data for one day
      const today = new Date().toISOString().split('T')[0];
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.groupBy.mockReturnThis();
      mockDb.orderBy.mockResolvedValueOnce([{ date: today, count: 5 }]);

      const result = await analyticsService.getDailyConversations(tenantId, 7);

      expect(result).toHaveLength(7);
      // Today should have count 5, others should be 0
      const todayEntry = result.find((r) => r.date === today);
      expect(todayEntry?.count).toBe(5);

      const otherEntries = result.filter((r) => r.date !== today);
      for (const entry of otherEntries) {
        expect(entry.count).toBe(0);
      }
    });
  });

  describe('getRecentConversations', () => {
    it('should return recent conversations with default limit', async () => {
      const mockResult = [
        {
          id: 'conv-1',
          status: 'open',
          lastMessageAt: '2024-01-01T12:00:00Z',
          contact: { id: 'contact-1', name: 'John', phone: '+123', avatarUrl: null },
          channel: { id: 'channel-1', name: 'WhatsApp', type: 'whatsapp' },
        },
      ];

      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.leftJoin.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.orderBy.mockReturnThis();
      mockDb.limit.mockResolvedValueOnce(mockResult);

      const result = await analyticsService.getRecentConversations(tenantId);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('id', 'conv-1');
      expect(result[0]).toHaveProperty('contact');
      expect(result[0]).toHaveProperty('channel');
    });

    it('should respect custom limit', async () => {
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.leftJoin.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.orderBy.mockReturnThis();
      mockDb.limit.mockResolvedValueOnce([]);

      await analyticsService.getRecentConversations(tenantId, 10);

      expect(mockDb.limit).toHaveBeenCalledWith(10);
    });
  });
});
