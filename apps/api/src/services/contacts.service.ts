import { eq, and, ilike, desc, sql } from 'drizzle-orm';
import { db, schema } from '../lib/db';

const { contacts } = schema;

export interface ContactFilters {
  tenantId: string;
  search?: string;
  tag?: string;
  page?: number;
  limit?: number;
}

export interface CreateContactData {
  tenantId: string;
  name: string;
  phone?: string;
  email?: string;
  avatarUrl?: string;
  tags?: string[];
  customFields?: Record<string, unknown>;
  externalId?: string;
}

export interface UpdateContactData {
  name?: string;
  phone?: string;
  email?: string;
  avatarUrl?: string;
  tags?: string[];
  customFields?: Record<string, unknown>;
}

export const contactsService = {
  async findAll(filters: ContactFilters) {
    const { tenantId, search, tag, page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;

    const conditions = [
      eq(contacts.tenantId, tenantId),
      sql`${contacts.deletedAt} IS NULL`,
    ];

    if (search) {
      conditions.push(
        sql`(${contacts.name} ILIKE ${`%${search}%`} OR ${contacts.phone} ILIKE ${`%${search}%`} OR ${contacts.email} ILIKE ${`%${search}%`})`
      );
    }

    if (tag) {
      conditions.push(sql`${contacts.tags} @> ${JSON.stringify([tag])}::jsonb`);
    }

    const [data, countResult] = await Promise.all([
      db
        .select()
        .from(contacts)
        .where(and(...conditions))
        .orderBy(desc(contacts.updatedAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(contacts)
        .where(and(...conditions)),
    ]);

    const total = Number(countResult[0]?.count || 0);

    return {
      contacts: data,
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
      .select()
      .from(contacts)
      .where(
        and(
          eq(contacts.id, id),
          eq(contacts.tenantId, tenantId),
          sql`${contacts.deletedAt} IS NULL`
        )
      )
      .limit(1);

    return result[0] || null;
  },

  async findByPhone(phone: string, tenantId: string) {
    const result = await db
      .select()
      .from(contacts)
      .where(
        and(
          eq(contacts.phone, phone),
          eq(contacts.tenantId, tenantId),
          sql`${contacts.deletedAt} IS NULL`
        )
      )
      .limit(1);

    return result[0] || null;
  },

  async findByExternalId(externalId: string, tenantId: string) {
    const result = await db
      .select()
      .from(contacts)
      .where(
        and(
          eq(contacts.externalId, externalId),
          eq(contacts.tenantId, tenantId),
          sql`${contacts.deletedAt} IS NULL`
        )
      )
      .limit(1);

    return result[0] || null;
  },

  async create(data: CreateContactData) {
    const result = await db
      .insert(contacts)
      .values({
        tenantId: data.tenantId,
        name: data.name,
        phone: data.phone,
        email: data.email,
        avatarUrl: data.avatarUrl,
        tags: data.tags || [],
        customFields: data.customFields || {},
        externalId: data.externalId,
      })
      .returning();

    return result[0];
  },

  async update(id: string, tenantId: string, data: UpdateContactData) {
    const result = await db
      .update(contacts)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(eq(contacts.id, id), eq(contacts.tenantId, tenantId)))
      .returning();

    return result[0] || null;
  },

  async delete(id: string, tenantId: string) {
    // Soft delete
    const result = await db
      .update(contacts)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(contacts.id, id), eq(contacts.tenantId, tenantId)))
      .returning();

    return result[0] || null;
  },

  async addTag(id: string, tenantId: string, tag: string) {
    const contact = await this.findById(id, tenantId);
    if (!contact) return null;

    const currentTags = (contact.tags as string[]) || [];
    if (currentTags.includes(tag)) return contact;

    return this.update(id, tenantId, {
      tags: [...currentTags, tag],
    });
  },

  async removeTag(id: string, tenantId: string, tag: string) {
    const contact = await this.findById(id, tenantId);
    if (!contact) return null;

    const currentTags = (contact.tags as string[]) || [];
    return this.update(id, tenantId, {
      tags: currentTags.filter((t) => t !== tag),
    });
  },

  async findOrCreate(data: CreateContactData) {
    // Try to find by external ID first, then by phone
    if (data.externalId) {
      const existing = await this.findByExternalId(data.externalId, data.tenantId);
      if (existing) return { contact: existing, created: false };
    }

    if (data.phone) {
      const existing = await this.findByPhone(data.phone, data.tenantId);
      if (existing) return { contact: existing, created: false };
    }

    const contact = await this.create(data);
    return { contact, created: true };
  },
};
