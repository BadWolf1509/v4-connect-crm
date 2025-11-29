import { eq, and, desc, sql } from 'drizzle-orm';
import { db, schema } from '../lib/db';

const { channels, inboxes } = schema;

export interface ChannelFilters {
  tenantId: string;
  type?: 'whatsapp' | 'instagram' | 'messenger' | 'email';
  isActive?: boolean;
}

export interface CreateChannelData {
  tenantId: string;
  type: 'whatsapp' | 'instagram' | 'messenger' | 'email';
  provider?: 'evolution' | '360dialog';
  name: string;
  phoneNumber?: string;
  config?: Record<string, unknown>;
}

export interface UpdateChannelData {
  name?: string;
  phoneNumber?: string;
  config?: Record<string, unknown>;
  isActive?: boolean;
  connectedAt?: Date | null;
}

export const channelsService = {
  async findAll(filters: ChannelFilters) {
    const { tenantId, type, isActive } = filters;

    const conditions = [eq(channels.tenantId, tenantId)];

    if (type) {
      conditions.push(eq(channels.type, type));
    }

    if (isActive !== undefined) {
      conditions.push(eq(channels.isActive, isActive));
    }

    const data = await db
      .select()
      .from(channels)
      .where(and(...conditions))
      .orderBy(desc(channels.createdAt));

    return { channels: data };
  },

  async findById(id: string, tenantId: string) {
    const result = await db
      .select()
      .from(channels)
      .where(and(eq(channels.id, id), eq(channels.tenantId, tenantId)))
      .limit(1);

    return result[0] || null;
  },

  async findByPhoneNumber(phoneNumber: string, tenantId: string) {
    const result = await db
      .select()
      .from(channels)
      .where(
        and(
          eq(channels.phoneNumber, phoneNumber),
          eq(channels.tenantId, tenantId)
        )
      )
      .limit(1);

    return result[0] || null;
  },

  async create(data: CreateChannelData) {
    const result = await db
      .insert(channels)
      .values({
        tenantId: data.tenantId,
        type: data.type,
        provider: data.provider,
        name: data.name,
        phoneNumber: data.phoneNumber,
        config: data.config || {},
      })
      .returning();

    return result[0];
  },

  async update(id: string, tenantId: string, data: UpdateChannelData) {
    const result = await db
      .update(channels)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(eq(channels.id, id), eq(channels.tenantId, tenantId)))
      .returning();

    return result[0] || null;
  },

  async delete(id: string, tenantId: string) {
    const result = await db
      .delete(channels)
      .where(and(eq(channels.id, id), eq(channels.tenantId, tenantId)))
      .returning();

    return result[0] || null;
  },

  async connect(id: string, tenantId: string) {
    return this.update(id, tenantId, {
      isActive: true,
      connectedAt: new Date(),
    });
  },

  async disconnect(id: string, tenantId: string) {
    return this.update(id, tenantId, {
      isActive: false,
      connectedAt: null,
    });
  },
};
