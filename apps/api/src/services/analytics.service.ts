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

export interface ResponseTimeMetrics {
  averageResponseTime: number; // in seconds
  medianResponseTime: number; // in seconds
  fastestResponseTime: number; // in seconds
  slowestResponseTime: number; // in seconds
  totalResponses: number;
}

export interface AgentResponseTime {
  userId: string;
  userName: string;
  averageResponseTime: number; // in seconds
  totalResponses: number;
}

export interface DailyResponseTime {
  date: string;
  averageResponseTime: number; // in seconds
  totalResponses: number;
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

  // Response time metrics - calculates time between inbound message and first outbound response
  async getResponseTimeMetrics(tenantId: string, days = 30): Promise<ResponseTimeMetrics> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);
    const startDateStr = startDate.toISOString();

    // Calculate response times using a CTE (Common Table Expression)
    // For each inbound message, find the next outbound message in the same conversation
    const result = await db.execute(sql`
      WITH inbound_messages AS (
        SELECT
          id,
          conversation_id,
          created_at as inbound_time
        FROM messages
        WHERE tenant_id = ${tenantId}
          AND direction = 'inbound'
          AND sender_type = 'contact'
          AND created_at >= ${startDateStr}::timestamptz
          AND deleted_at IS NULL
      ),
      response_pairs AS (
        SELECT
          im.id as inbound_id,
          im.conversation_id,
          im.inbound_time,
          MIN(om.created_at) as response_time
        FROM inbound_messages im
        LEFT JOIN messages om ON
          om.conversation_id = im.conversation_id
          AND om.direction = 'outbound'
          AND om.sender_type IN ('user', 'bot')
          AND om.created_at > im.inbound_time
          AND om.deleted_at IS NULL
        GROUP BY im.id, im.conversation_id, im.inbound_time
        HAVING MIN(om.created_at) IS NOT NULL
      ),
      response_times AS (
        SELECT
          EXTRACT(EPOCH FROM (response_time - inbound_time)) as response_seconds
        FROM response_pairs
      )
      SELECT
        COALESCE(AVG(response_seconds), 0)::float as avg_response,
        COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY response_seconds), 0)::float as median_response,
        COALESCE(MIN(response_seconds), 0)::float as min_response,
        COALESCE(MAX(response_seconds), 0)::float as max_response,
        COUNT(*)::int as total_responses
      FROM response_times
    `);

    const rows = result as unknown as Array<Record<string, unknown>>;
    const row = rows[0];

    return {
      averageResponseTime: Math.round(Number(row?.avg_response || 0)),
      medianResponseTime: Math.round(Number(row?.median_response || 0)),
      fastestResponseTime: Math.round(Number(row?.min_response || 0)),
      slowestResponseTime: Math.round(Number(row?.max_response || 0)),
      totalResponses: Number(row?.total_responses || 0),
    };
  },

  // Response time by agent
  async getResponseTimeByAgent(tenantId: string, days = 30): Promise<AgentResponseTime[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);
    const startDateStr = startDate.toISOString();

    const result = await db.execute(sql`
      WITH inbound_messages AS (
        SELECT
          id,
          conversation_id,
          created_at as inbound_time
        FROM messages
        WHERE tenant_id = ${tenantId}
          AND direction = 'inbound'
          AND sender_type = 'contact'
          AND created_at >= ${startDateStr}::timestamptz
          AND deleted_at IS NULL
      ),
      response_pairs AS (
        SELECT DISTINCT ON (im.id)
          im.id as inbound_id,
          im.inbound_time,
          om.sender_id,
          om.created_at as response_time
        FROM inbound_messages im
        INNER JOIN messages om ON
          om.conversation_id = im.conversation_id
          AND om.direction = 'outbound'
          AND om.sender_type = 'user'
          AND om.sender_id IS NOT NULL
          AND om.created_at > im.inbound_time
          AND om.deleted_at IS NULL
        ORDER BY im.id, om.created_at ASC
      )
      SELECT
        rp.sender_id as user_id,
        u.name as user_name,
        AVG(EXTRACT(EPOCH FROM (rp.response_time - rp.inbound_time)))::float as avg_response,
        COUNT(*)::int as total_responses
      FROM response_pairs rp
      INNER JOIN users u ON u.id = rp.sender_id
      GROUP BY rp.sender_id, u.name
      ORDER BY avg_response ASC
    `);

    const rows = result as unknown as Array<Record<string, unknown>>;
    return rows.map((row) => ({
      userId: row.user_id as string,
      userName: row.user_name as string,
      averageResponseTime: Math.round(Number(row.avg_response || 0)),
      totalResponses: Number(row.total_responses || 0),
    }));
  },

  // Daily response time trend
  async getDailyResponseTime(tenantId: string, days = 7): Promise<DailyResponseTime[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);
    const startDateStr = startDate.toISOString();

    const result = await db.execute(sql`
      WITH inbound_messages AS (
        SELECT
          id,
          conversation_id,
          created_at as inbound_time,
          DATE(created_at) as msg_date
        FROM messages
        WHERE tenant_id = ${tenantId}
          AND direction = 'inbound'
          AND sender_type = 'contact'
          AND created_at >= ${startDateStr}::timestamptz
          AND deleted_at IS NULL
      ),
      response_pairs AS (
        SELECT
          im.id as inbound_id,
          im.msg_date,
          im.inbound_time,
          MIN(om.created_at) as response_time
        FROM inbound_messages im
        LEFT JOIN messages om ON
          om.conversation_id = im.conversation_id
          AND om.direction = 'outbound'
          AND om.sender_type IN ('user', 'bot')
          AND om.created_at > im.inbound_time
          AND om.deleted_at IS NULL
        GROUP BY im.id, im.msg_date, im.inbound_time
        HAVING MIN(om.created_at) IS NOT NULL
      )
      SELECT
        msg_date::text as date,
        AVG(EXTRACT(EPOCH FROM (response_time - inbound_time)))::float as avg_response,
        COUNT(*)::int as total_responses
      FROM response_pairs
      GROUP BY msg_date
      ORDER BY msg_date ASC
    `);

    // Fill in missing dates with null
    const rows = result as unknown as Array<Record<string, unknown>>;
    const dateMap = new Map(
      rows.map((r) => [
        r.date as string,
        {
          averageResponseTime: Math.round(Number(r.avg_response || 0)),
          totalResponses: Number(r.total_responses || 0),
        },
      ]),
    );

    const filledResult: DailyResponseTime[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const data = dateMap.get(dateStr);
      filledResult.push({
        date: dateStr,
        averageResponseTime: data?.averageResponseTime || 0,
        totalResponses: data?.totalResponses || 0,
      });
    }

    return filledResult;
  },
};
