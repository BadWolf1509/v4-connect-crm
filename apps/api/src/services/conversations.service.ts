import { and, desc, eq, or, sql } from 'drizzle-orm';
import { db, schema } from '../lib/db';

const { conversations, contacts, channels, users, messages: _messages } = schema;

export interface ConversationFilters {
  tenantId: string;
  status?: 'pending' | 'open' | 'resolved' | 'snoozed';
  assigneeId?: string;
  inboxId?: string;
  channelId?: string;
  page?: number;
  limit?: number;
}

export interface CreateConversationData {
  tenantId: string;
  channelId: string;
  contactId: string;
  inboxId?: string;
  assigneeId?: string;
  teamId?: string;
  status?: 'pending' | 'open' | 'resolved' | 'snoozed';
  metadata?: Record<string, unknown>;
}

export interface UpdateConversationData {
  status?: 'pending' | 'open' | 'resolved' | 'snoozed';
  assigneeId?: string | null;
  teamId?: string | null;
  inboxId?: string | null;
  snoozedUntil?: Date | null;
  metadata?: Record<string, unknown>;
}

export const conversationsService = {
  async findAll(filters: ConversationFilters) {
    const { tenantId, status, assigneeId, inboxId, channelId, page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;

    const conditions = [eq(conversations.tenantId, tenantId)];

    if (status) {
      conditions.push(eq(conversations.status, status));
    }

    if (assigneeId) {
      conditions.push(eq(conversations.assigneeId, assigneeId));
    }

    if (inboxId) {
      conditions.push(eq(conversations.inboxId, inboxId));
    }

    if (channelId) {
      conditions.push(eq(conversations.channelId, channelId));
    }

    const [data, countResult] = await Promise.all([
      db
        .select({
          id: conversations.id,
          tenantId: conversations.tenantId,
          channelId: conversations.channelId,
          inboxId: conversations.inboxId,
          contactId: conversations.contactId,
          assigneeId: conversations.assigneeId,
          teamId: conversations.teamId,
          status: conversations.status,
          lastMessageAt: conversations.lastMessageAt,
          snoozedUntil: conversations.snoozedUntil,
          metadata: conversations.metadata,
          createdAt: conversations.createdAt,
          updatedAt: conversations.updatedAt,
          contact: {
            id: contacts.id,
            name: contacts.name,
            phone: contacts.phone,
            email: contacts.email,
            avatarUrl: contacts.avatarUrl,
          },
          channel: {
            id: channels.id,
            type: channels.type,
            name: channels.name,
          },
          assignee: {
            id: users.id,
            name: users.name,
            email: users.email,
          },
        })
        .from(conversations)
        .leftJoin(contacts, eq(conversations.contactId, contacts.id))
        .leftJoin(channels, eq(conversations.channelId, channels.id))
        .leftJoin(users, eq(conversations.assigneeId, users.id))
        .where(and(...conditions))
        .orderBy(desc(conversations.lastMessageAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(conversations)
        .where(and(...conditions)),
    ]);

    const total = Number(countResult[0]?.count || 0);

    return {
      conversations: data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async findById(id: string, tenantId: string) {
    const result = await db
      .select({
        id: conversations.id,
        tenantId: conversations.tenantId,
        channelId: conversations.channelId,
        inboxId: conversations.inboxId,
        contactId: conversations.contactId,
        assigneeId: conversations.assigneeId,
        teamId: conversations.teamId,
        status: conversations.status,
        lastMessageAt: conversations.lastMessageAt,
        snoozedUntil: conversations.snoozedUntil,
        metadata: conversations.metadata,
        createdAt: conversations.createdAt,
        updatedAt: conversations.updatedAt,
        contact: {
          id: contacts.id,
          name: contacts.name,
          phone: contacts.phone,
          email: contacts.email,
          avatarUrl: contacts.avatarUrl,
          tags: contacts.tags,
          customFields: contacts.customFields,
        },
        channel: {
          id: channels.id,
          type: channels.type,
          name: channels.name,
        },
        assignee: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(conversations)
      .leftJoin(contacts, eq(conversations.contactId, contacts.id))
      .leftJoin(channels, eq(conversations.channelId, channels.id))
      .leftJoin(users, eq(conversations.assigneeId, users.id))
      .where(and(eq(conversations.id, id), eq(conversations.tenantId, tenantId)))
      .limit(1);

    return result[0] || null;
  },

  async findByContactAndChannel(contactId: string, channelId: string, tenantId: string) {
    const result = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.contactId, contactId),
          eq(conversations.channelId, channelId),
          eq(conversations.tenantId, tenantId),
          or(eq(conversations.status, 'pending'), eq(conversations.status, 'open')),
        ),
      )
      .orderBy(desc(conversations.createdAt))
      .limit(1);

    return result[0] || null;
  },

  async create(data: CreateConversationData) {
    const result = await db
      .insert(conversations)
      .values({
        tenantId: data.tenantId,
        channelId: data.channelId,
        contactId: data.contactId,
        inboxId: data.inboxId,
        assigneeId: data.assigneeId,
        teamId: data.teamId,
        status: data.status || 'pending',
        metadata: data.metadata || {},
        lastMessageAt: new Date(),
      })
      .returning();

    return result[0];
  },

  async update(id: string, tenantId: string, data: UpdateConversationData) {
    const result = await db
      .update(conversations)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(eq(conversations.id, id), eq(conversations.tenantId, tenantId)))
      .returning();

    return result[0] || null;
  },

  async updateLastMessage(id: string, tenantId: string) {
    return this.update(id, tenantId, {
      // Force update of lastMessageAt
    });
  },

  async assign(id: string, tenantId: string, assigneeId: string) {
    return this.update(id, tenantId, {
      assigneeId,
      status: 'open',
    });
  },

  async unassign(id: string, tenantId: string) {
    return this.update(id, tenantId, {
      assigneeId: null,
      status: 'pending',
    });
  },

  async resolve(id: string, tenantId: string) {
    return this.update(id, tenantId, {
      status: 'resolved',
    });
  },

  async reopen(id: string, tenantId: string) {
    return this.update(id, tenantId, {
      status: 'open',
    });
  },

  async snooze(id: string, tenantId: string, until: Date) {
    return this.update(id, tenantId, {
      status: 'snoozed',
      snoozedUntil: until,
    });
  },

  async findOrCreate(data: CreateConversationData) {
    const existing = await this.findByContactAndChannel(
      data.contactId,
      data.channelId,
      data.tenantId,
    );

    if (existing) {
      // Reopen if resolved
      if (existing.status === 'resolved') {
        await this.reopen(existing.id, data.tenantId);
      }
      return { conversation: existing, created: false };
    }

    const conversation = await this.create(data);
    return { conversation, created: true };
  },
};
