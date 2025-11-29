import { eq, and, desc, lt, sql } from 'drizzle-orm';
import { db, schema } from '../lib/db';
import { conversationsService } from './conversations.service';

const { messages, conversations } = schema;

export interface MessageFilters {
  conversationId: string;
  tenantId: string;
  cursor?: string;
  limit?: number;
}

export interface CreateMessageData {
  conversationId: string;
  tenantId: string;
  senderId?: string;
  senderType: 'user' | 'contact' | 'bot';
  type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'sticker' | 'template';
  content?: string;
  mediaUrl?: string;
  mediaType?: string;
  metadata?: Record<string, unknown>;
  externalId?: string;
}

export interface UpdateMessageData {
  status?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  content?: string;
  metadata?: Record<string, unknown>;
}

export const messagesService = {
  async findByConversation(filters: MessageFilters) {
    const { conversationId, tenantId, cursor, limit = 50 } = filters;

    const conditions = [
      eq(messages.conversationId, conversationId),
      eq(messages.tenantId, tenantId),
      sql`${messages.deletedAt} IS NULL`,
    ];

    if (cursor) {
      conditions.push(lt(messages.createdAt, new Date(cursor)));
    }

    const data = await db
      .select()
      .from(messages)
      .where(and(...conditions))
      .orderBy(desc(messages.createdAt))
      .limit(limit + 1);

    const hasMore = data.length > limit;
    const messagesList = hasMore ? data.slice(0, -1) : data;

    return {
      messages: messagesList.reverse(), // Return in chronological order
      nextCursor: hasMore ? messagesList[messagesList.length - 1]?.createdAt.toISOString() : null,
      hasMore,
    };
  },

  async findById(id: string, tenantId: string) {
    const result = await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.id, id),
          eq(messages.tenantId, tenantId),
          sql`${messages.deletedAt} IS NULL`
        )
      )
      .limit(1);

    return result[0] || null;
  },

  async findByExternalId(externalId: string, tenantId: string) {
    const result = await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.externalId, externalId),
          eq(messages.tenantId, tenantId)
        )
      )
      .limit(1);

    return result[0] || null;
  },

  async create(data: CreateMessageData) {
    const result = await db
      .insert(messages)
      .values({
        conversationId: data.conversationId,
        tenantId: data.tenantId,
        senderId: data.senderId,
        senderType: data.senderType,
        type: data.type,
        content: data.content,
        mediaUrl: data.mediaUrl,
        mediaType: data.mediaType,
        status: 'pending',
        metadata: data.metadata || {},
        externalId: data.externalId,
      })
      .returning();

    // Update conversation lastMessageAt
    await db
      .update(conversations)
      .set({
        lastMessageAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(conversations.id, data.conversationId));

    return result[0];
  },

  async update(id: string, tenantId: string, data: UpdateMessageData) {
    const result = await db
      .update(messages)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(eq(messages.id, id), eq(messages.tenantId, tenantId)))
      .returning();

    return result[0] || null;
  },

  async updateStatus(id: string, tenantId: string, status: 'sent' | 'delivered' | 'read' | 'failed') {
    return this.update(id, tenantId, { status });
  },

  async updateByExternalId(externalId: string, tenantId: string, data: UpdateMessageData) {
    const result = await db
      .update(messages)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(eq(messages.externalId, externalId), eq(messages.tenantId, tenantId)))
      .returning();

    return result[0] || null;
  },

  async delete(id: string, tenantId: string) {
    const result = await db
      .update(messages)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(messages.id, id), eq(messages.tenantId, tenantId)))
      .returning();

    return result[0] || null;
  },

  async getUnreadCount(conversationId: string, tenantId: string) {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(messages)
      .where(
        and(
          eq(messages.conversationId, conversationId),
          eq(messages.tenantId, tenantId),
          eq(messages.senderType, 'contact'),
          sql`${messages.status} != 'read'`,
          sql`${messages.deletedAt} IS NULL`
        )
      );

    return Number(result[0]?.count || 0);
  },

  async markAsRead(conversationId: string, tenantId: string) {
    await db
      .update(messages)
      .set({
        status: 'read',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(messages.conversationId, conversationId),
          eq(messages.tenantId, tenantId),
          eq(messages.senderType, 'contact'),
          sql`${messages.status} != 'read'`
        )
      );
  },
};
