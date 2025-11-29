import { eq, and, desc } from 'drizzle-orm';
import { db, schema } from '../lib/db';

const { inboxes, channels } = schema;

export interface InboxFilters {
  tenantId: string;
  channelId?: string;
}

export interface CreateInboxData {
  tenantId: string;
  channelId: string;
  name: string;
  isDefault?: boolean;
}

export interface UpdateInboxData {
  name?: string;
  isDefault?: boolean;
}

export const inboxesService = {
  async findAll(filters: InboxFilters) {
    const { tenantId, channelId } = filters;

    const conditions = [eq(inboxes.tenantId, tenantId)];

    if (channelId) {
      conditions.push(eq(inboxes.channelId, channelId));
    }

    const data = await db
      .select({
        id: inboxes.id,
        tenantId: inboxes.tenantId,
        channelId: inboxes.channelId,
        name: inboxes.name,
        isDefault: inboxes.isDefault,
        createdAt: inboxes.createdAt,
        updatedAt: inboxes.updatedAt,
        channel: {
          id: channels.id,
          type: channels.type,
          name: channels.name,
        },
      })
      .from(inboxes)
      .leftJoin(channels, eq(inboxes.channelId, channels.id))
      .where(and(...conditions))
      .orderBy(desc(inboxes.createdAt));

    return { inboxes: data };
  },

  async findById(id: string, tenantId: string) {
    const result = await db
      .select({
        id: inboxes.id,
        tenantId: inboxes.tenantId,
        channelId: inboxes.channelId,
        name: inboxes.name,
        isDefault: inboxes.isDefault,
        createdAt: inboxes.createdAt,
        updatedAt: inboxes.updatedAt,
        channel: {
          id: channels.id,
          type: channels.type,
          name: channels.name,
        },
      })
      .from(inboxes)
      .leftJoin(channels, eq(inboxes.channelId, channels.id))
      .where(and(eq(inboxes.id, id), eq(inboxes.tenantId, tenantId)))
      .limit(1);

    return result[0] || null;
  },

  async findDefault(tenantId: string) {
    const result = await db
      .select()
      .from(inboxes)
      .where(and(eq(inboxes.tenantId, tenantId), eq(inboxes.isDefault, true)))
      .limit(1);

    return result[0] || null;
  },

  async create(data: CreateInboxData) {
    // If this is the default inbox, unset other defaults
    if (data.isDefault) {
      await db
        .update(inboxes)
        .set({ isDefault: false })
        .where(eq(inboxes.tenantId, data.tenantId));
    }

    const result = await db
      .insert(inboxes)
      .values({
        tenantId: data.tenantId,
        channelId: data.channelId,
        name: data.name,
        isDefault: data.isDefault || false,
      })
      .returning();

    return result[0];
  },

  async update(id: string, tenantId: string, data: UpdateInboxData) {
    // If setting as default, unset other defaults first
    if (data.isDefault) {
      await db
        .update(inboxes)
        .set({ isDefault: false })
        .where(eq(inboxes.tenantId, tenantId));
    }

    const result = await db
      .update(inboxes)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(eq(inboxes.id, id), eq(inboxes.tenantId, tenantId)))
      .returning();

    return result[0] || null;
  },

  async delete(id: string, tenantId: string) {
    const result = await db
      .delete(inboxes)
      .where(and(eq(inboxes.id, id), eq(inboxes.tenantId, tenantId)))
      .returning();

    return result[0] || null;
  },
};
