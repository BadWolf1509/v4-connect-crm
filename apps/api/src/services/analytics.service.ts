import { and, count, eq, gte, lte, sql } from 'drizzle-orm';
import { db, schema } from '../lib/db';

const { conversations, messages, contacts, channels, campaigns } = schema;

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

export interface CampaignMetrics {
  totalCampaigns: number;
  activeCampaigns: number;
  completedCampaigns: number;
  totalMessagesSent: number;
  totalDelivered: number;
  totalRead: number;
  totalFailed: number;
  deliveryRate: number;
  readRate: number;
}

export interface CampaignPerformance {
  id: string;
  name: string;
  status: string;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  deliveryRate: number;
  readRate: number;
  createdAt: Date;
}

export interface AgentPerformance {
  userId: string;
  userName: string;
  userEmail: string;
  conversationsHandled: number;
  conversationsResolved: number;
  messageseSent: number;
  averageResponseTime: number;
  resolutionRate: number;
}

export interface DateRangeFilter {
  startDate?: Date;
  endDate?: Date;
  days?: number;
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

  // Campaign metrics
  async getCampaignMetrics(tenantId: string, filter?: DateRangeFilter): Promise<CampaignMetrics> {
    const { startDate, endDate } = this.getDateRange(filter);

    // Get all campaigns in date range
    const campaignData = await db
      .select({
        id: campaigns.id,
        status: campaigns.status,
        stats: campaigns.stats,
      })
      .from(campaigns)
      .where(
        and(
          eq(campaigns.tenantId, tenantId),
          startDate ? gte(campaigns.createdAt, startDate) : undefined,
          endDate ? lte(campaigns.createdAt, endDate) : undefined,
        ),
      );

    let totalSent = 0;
    let totalDelivered = 0;
    let totalRead = 0;
    let totalFailed = 0;
    let activeCampaigns = 0;
    let completedCampaigns = 0;

    for (const campaign of campaignData) {
      const stats = campaign.stats as {
        sent?: number;
        delivered?: number;
        read?: number;
        failed?: number;
      } | null;
      if (stats) {
        totalSent += stats.sent || 0;
        totalDelivered += stats.delivered || 0;
        totalRead += stats.read || 0;
        totalFailed += stats.failed || 0;
      }
      if (campaign.status === 'running' || campaign.status === 'scheduled') activeCampaigns++;
      if (campaign.status === 'completed') completedCampaigns++;
    }

    return {
      totalCampaigns: campaignData.length,
      activeCampaigns,
      completedCampaigns,
      totalMessagesSent: totalSent,
      totalDelivered,
      totalRead,
      totalFailed,
      deliveryRate: totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0,
      readRate: totalDelivered > 0 ? Math.round((totalRead / totalDelivered) * 100) : 0,
    };
  },

  // Campaign performance list
  async getCampaignPerformance(
    tenantId: string,
    filter?: DateRangeFilter,
  ): Promise<CampaignPerformance[]> {
    const { startDate, endDate } = this.getDateRange(filter);

    const campaignData = await db
      .select({
        id: campaigns.id,
        name: campaigns.name,
        status: campaigns.status,
        stats: campaigns.stats,
        createdAt: campaigns.createdAt,
      })
      .from(campaigns)
      .where(
        and(
          eq(campaigns.tenantId, tenantId),
          startDate ? gte(campaigns.createdAt, startDate) : undefined,
          endDate ? lte(campaigns.createdAt, endDate) : undefined,
        ),
      )
      .orderBy(sql`${campaigns.createdAt} DESC`)
      .limit(20);

    return campaignData.map((campaign) => {
      const stats = campaign.stats as {
        sent?: number;
        delivered?: number;
        read?: number;
        failed?: number;
      } | null;
      const sent = stats?.sent || 0;
      const delivered = stats?.delivered || 0;
      const read = stats?.read || 0;
      const failed = stats?.failed || 0;

      return {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        sent,
        delivered,
        read,
        failed,
        deliveryRate: sent > 0 ? Math.round((delivered / sent) * 100) : 0,
        readRate: delivered > 0 ? Math.round((read / delivered) * 100) : 0,
        createdAt: campaign.createdAt,
      };
    });
  },

  // Agent performance metrics
  async getAgentPerformance(
    tenantId: string,
    filter?: DateRangeFilter,
  ): Promise<AgentPerformance[]> {
    const { startDate, endDate } = this.getDateRange(filter);
    const startDateStr = startDate?.toISOString() || new Date(0).toISOString();
    const endDateStr = endDate?.toISOString() || new Date().toISOString();

    const result = await db.execute(sql`
      WITH agent_conversations AS (
        SELECT
          c.assignee_id,
          c.id as conversation_id,
          c.status
        FROM conversations c
        WHERE c.tenant_id = ${tenantId}
          AND c.assignee_id IS NOT NULL
          AND c.created_at >= ${startDateStr}::timestamptz
          AND c.created_at <= ${endDateStr}::timestamptz
      ),
      agent_messages AS (
        SELECT
          m.sender_id,
          COUNT(*) as message_count
        FROM messages m
        WHERE m.tenant_id = ${tenantId}
          AND m.sender_type = 'user'
          AND m.sender_id IS NOT NULL
          AND m.created_at >= ${startDateStr}::timestamptz
          AND m.created_at <= ${endDateStr}::timestamptz
          AND m.deleted_at IS NULL
        GROUP BY m.sender_id
      ),
      response_times AS (
        SELECT
          om.sender_id,
          AVG(EXTRACT(EPOCH FROM (om.created_at - im.created_at)))::float as avg_response
        FROM messages im
        INNER JOIN messages om ON
          om.conversation_id = im.conversation_id
          AND om.direction = 'outbound'
          AND om.sender_type = 'user'
          AND om.created_at > im.created_at
          AND om.deleted_at IS NULL
        WHERE im.tenant_id = ${tenantId}
          AND im.direction = 'inbound'
          AND im.sender_type = 'contact'
          AND im.created_at >= ${startDateStr}::timestamptz
          AND im.created_at <= ${endDateStr}::timestamptz
          AND im.deleted_at IS NULL
        GROUP BY om.sender_id
      )
      SELECT
        u.id as user_id,
        u.name as user_name,
        u.email as user_email,
        COALESCE(COUNT(DISTINCT ac.conversation_id), 0)::int as conversations_handled,
        COALESCE(SUM(CASE WHEN ac.status = 'resolved' THEN 1 ELSE 0 END), 0)::int as conversations_resolved,
        COALESCE(am.message_count, 0)::int as messages_sent,
        COALESCE(rt.avg_response, 0)::float as avg_response_time
      FROM users u
      LEFT JOIN agent_conversations ac ON ac.assignee_id = u.id
      LEFT JOIN agent_messages am ON am.sender_id = u.id
      LEFT JOIN response_times rt ON rt.sender_id = u.id
      WHERE u.tenant_id = ${tenantId}
        AND u.role IN ('admin', 'agent')
      GROUP BY u.id, u.name, u.email, am.message_count, rt.avg_response
      ORDER BY conversations_handled DESC
    `);

    const rows = result as unknown as Array<Record<string, unknown>>;
    return rows.map((row) => {
      const handled = Number(row.conversations_handled || 0);
      const resolved = Number(row.conversations_resolved || 0);
      return {
        userId: row.user_id as string,
        userName: row.user_name as string,
        userEmail: row.user_email as string,
        conversationsHandled: handled,
        conversationsResolved: resolved,
        messageseSent: Number(row.messages_sent || 0),
        averageResponseTime: Math.round(Number(row.avg_response_time || 0)),
        resolutionRate: handled > 0 ? Math.round((resolved / handled) * 100) : 0,
      };
    });
  },

  // Export report data
  async exportReport(
    tenantId: string,
    reportType: 'overview' | 'conversations' | 'agents' | 'campaigns',
    filter?: DateRangeFilter,
  ): Promise<Record<string, unknown>[]> {
    const { startDate, endDate, days } = this.getDateRange(filter);

    switch (reportType) {
      case 'overview': {
        const overview = await this.getOverview(tenantId);
        const dailyConversations = await this.getDailyConversations(tenantId, days || 30);
        const responseTime = await this.getResponseTimeMetrics(tenantId, days || 30);
        return [
          {
            ...overview,
            ...responseTime,
            dailyConversations,
            exportedAt: new Date().toISOString(),
          },
        ];
      }
      case 'conversations': {
        const result = await db
          .select({
            id: conversations.id,
            status: conversations.status,
            createdAt: conversations.createdAt,
            lastMessageAt: conversations.lastMessageAt,
            contactName: contacts.name,
            contactPhone: contacts.phone,
            channelName: channels.name,
            channelType: channels.type,
          })
          .from(conversations)
          .leftJoin(contacts, eq(conversations.contactId, contacts.id))
          .leftJoin(channels, eq(conversations.channelId, channels.id))
          .where(
            and(
              eq(conversations.tenantId, tenantId),
              startDate ? gte(conversations.createdAt, startDate) : undefined,
              endDate ? lte(conversations.createdAt, endDate) : undefined,
            ),
          )
          .orderBy(sql`${conversations.createdAt} DESC`)
          .limit(1000);
        return result;
      }
      case 'agents': {
        const agents = await this.getAgentPerformance(tenantId, filter);
        return agents as unknown as Record<string, unknown>[];
      }
      case 'campaigns': {
        const campaignPerf = await this.getCampaignPerformance(tenantId, filter);
        return campaignPerf as unknown as Record<string, unknown>[];
      }
      default:
        return [];
    }
  },

  // Helper to get date range from filter
  getDateRange(filter?: DateRangeFilter): { startDate?: Date; endDate?: Date; days: number } {
    if (!filter) {
      return { days: 30 };
    }

    let startDate = filter.startDate;
    const endDate = filter.endDate || new Date();
    const days = filter.days || 30;

    if (!startDate && days) {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0);
    }

    return { startDate, endDate, days };
  },
};
