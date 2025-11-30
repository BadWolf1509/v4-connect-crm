import { and, count, eq, gte, sql } from 'drizzle-orm';
import { db, schema } from '../lib/db';

const { conversations, messages, contacts, channels } = schema;

export interface AnalyticsOverview {
  totalConversations: number;
  openConversations: number;
  pendingConversations: number;
  resolvedConversations: number;
  totalContacts: number;
  totalMessages: number;
  activeChannels: number;
}

export interface ConversationsByStatus {
  status: string;
  count: number;
}

export interface ConversationsByChannel {
  channelId: string;
  channelName: string;
  channelType: string;
  count: number;
}

export interface DailyConversations {
  date: string;
  count: number;
}

export const analyticsService = {
  async getOverview(tenantId: string): Promise<AnalyticsOverview> {
    const [
      totalConversationsResult,
      openConversationsResult,
      pendingConversationsResult,
      resolvedConversationsResult,
      totalContactsResult,
      totalMessagesResult,
      activeChannelsResult,
    ] = await Promise.all([
      // Total conversations
      db
        .select({ count: count() })
        .from(conversations)
        .where(eq(conversations.tenantId, tenantId)),

      // Open conversations
      db
        .select({ count: count() })
        .from(conversations)
        .where(and(eq(conversations.tenantId, tenantId), eq(conversations.status, 'open'))),

      // Pending conversations
      db
        .select({ count: count() })
        .from(conversations)
        .where(and(eq(conversations.tenantId, tenantId), eq(conversations.status, 'pending'))),

      // Resolved conversations
      db
        .select({ count: count() })
        .from(conversations)
        .where(and(eq(conversations.tenantId, tenantId), eq(conversations.status, 'resolved'))),

      // Total contacts
      db
        .select({ count: count() })
        .from(contacts)
        .where(eq(contacts.tenantId, tenantId)),

      // Total messages
      db
        .select({ count: count() })
        .from(messages)
        .where(eq(messages.tenantId, tenantId)),

      // Active channels
      db
        .select({ count: count() })
        .from(channels)
        .where(and(eq(channels.tenantId, tenantId), eq(channels.isActive, true))),
    ]);

    return {
      totalConversations: totalConversationsResult[0]?.count || 0,
      openConversations: openConversationsResult[0]?.count || 0,
      pendingConversations: pendingConversationsResult[0]?.count || 0,
      resolvedConversations: resolvedConversationsResult[0]?.count || 0,
      totalContacts: totalContactsResult[0]?.count || 0,
      totalMessages: totalMessagesResult[0]?.count || 0,
      activeChannels: activeChannelsResult[0]?.count || 0,
    };
  },

  async getConversationsByStatus(tenantId: string): Promise<ConversationsByStatus[]> {
    const result = await db
      .select({
        status: conversations.status,
        count: count(),
      })
      .from(conversations)
      .where(eq(conversations.tenantId, tenantId))
      .groupBy(conversations.status);

    return result.map((r) => ({
      status: r.status,
      count: r.count,
    }));
  },

  async getConversationsByChannel(tenantId: string): Promise<ConversationsByChannel[]> {
    const result = await db
      .select({
        channelId: channels.id,
        channelName: channels.name,
        channelType: channels.type,
        count: count(),
      })
      .from(conversations)
      .innerJoin(channels, eq(conversations.channelId, channels.id))
      .where(eq(conversations.tenantId, tenantId))
      .groupBy(channels.id, channels.name, channels.type);

    return result.map((r) => ({
      channelId: r.channelId,
      channelName: r.channelName,
      channelType: r.channelType,
      count: r.count,
    }));
  },

  async getDailyConversations(tenantId: string, days = 7): Promise<DailyConversations[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const result = await db
      .select({
        date: sql<string>`DATE(${conversations.createdAt})`,
        count: count(),
      })
      .from(conversations)
      .where(and(eq(conversations.tenantId, tenantId), gte(conversations.createdAt, startDate)))
      .groupBy(sql`DATE(${conversations.createdAt})`)
      .orderBy(sql`DATE(${conversations.createdAt})`);

    // Fill in missing dates with 0
    const dateMap = new Map(result.map((r) => [r.date, r.count]));
    const filledResult: DailyConversations[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      filledResult.push({
        date: dateStr,
        count: dateMap.get(dateStr) || 0,
      });
    }

    return filledResult;
  },

  async getRecentConversations(tenantId: string, limit = 5) {
    const result = await db
      .select({
        id: conversations.id,
        status: conversations.status,
        lastMessageAt: conversations.lastMessageAt,
        contact: {
          id: contacts.id,
          name: contacts.name,
          phone: contacts.phone,
          avatarUrl: contacts.avatarUrl,
        },
        channel: {
          id: channels.id,
          name: channels.name,
          type: channels.type,
        },
      })
      .from(conversations)
      .leftJoin(contacts, eq(conversations.contactId, contacts.id))
      .leftJoin(channels, eq(conversations.channelId, channels.id))
      .where(eq(conversations.tenantId, tenantId))
      .orderBy(sql`${conversations.lastMessageAt} DESC`)
      .limit(limit);

    return result;
  },
};
