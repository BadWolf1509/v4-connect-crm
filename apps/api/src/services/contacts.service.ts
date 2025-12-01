import { and, desc, eq, sql } from 'drizzle-orm';
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

    const conditions = [eq(contacts.tenantId, tenantId), sql`${contacts.deletedAt} IS NULL`];

    if (search) {
      conditions.push(
        sql`(${contacts.name} ILIKE ${`%${search}%`} OR ${contacts.phone} ILIKE ${`%${search}%`} OR ${contacts.email} ILIKE ${`%${search}%`})`,
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
          sql`${contacts.deletedAt} IS NULL`,
        ),
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
          sql`${contacts.deletedAt} IS NULL`,
        ),
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
          sql`${contacts.deletedAt} IS NULL`,
        ),
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

  // Find potential duplicates
  async findDuplicates(tenantId: string) {
    // Find contacts with duplicate phone or email
    const duplicatesByPhone = await db.execute(sql`
      SELECT c1.id, c1.name, c1.phone, c1.email, c1.avatar_url, c1.tags, c1.created_at,
             c2.id as duplicate_id, c2.name as duplicate_name, c2.phone as duplicate_phone,
             c2.email as duplicate_email, c2.avatar_url as duplicate_avatar_url,
             c2.tags as duplicate_tags, c2.created_at as duplicate_created_at
      FROM contacts c1
      INNER JOIN contacts c2 ON (
        (c1.phone IS NOT NULL AND c1.phone = c2.phone AND c1.id < c2.id)
        OR (c1.email IS NOT NULL AND c1.email = c2.email AND c1.id < c2.id)
      )
      WHERE c1.tenant_id = ${tenantId}
        AND c2.tenant_id = ${tenantId}
        AND c1.deleted_at IS NULL
        AND c2.deleted_at IS NULL
      ORDER BY c1.created_at DESC
      LIMIT 50
    `);

    // Group duplicates by original contact
    const duplicateGroups: Array<{
      contact: {
        id: string;
        name: string;
        phone: string | null;
        email: string | null;
        avatarUrl: string | null;
        tags: string[];
        createdAt: Date;
      };
      duplicates: Array<{
        id: string;
        name: string;
        phone: string | null;
        email: string | null;
        avatarUrl: string | null;
        tags: string[];
        createdAt: Date;
      }>;
      matchType: 'phone' | 'email' | 'both';
    }> = [];

    const seenIds = new Set<string>();
    const rows = duplicatesByPhone as unknown as Array<Record<string, unknown>>;

    for (const row of rows) {
      const contactId = row.id as string;
      const duplicateId = row.duplicate_id as string;

      if (seenIds.has(contactId) || seenIds.has(duplicateId)) continue;

      const contact = {
        id: contactId,
        name: row.name as string,
        phone: row.phone as string | null,
        email: row.email as string | null,
        avatarUrl: row.avatar_url as string | null,
        tags: (row.tags as string[]) || [],
        createdAt: row.created_at as Date,
      };

      const duplicate = {
        id: duplicateId,
        name: row.duplicate_name as string,
        phone: row.duplicate_phone as string | null,
        email: row.duplicate_email as string | null,
        avatarUrl: row.duplicate_avatar_url as string | null,
        tags: (row.duplicate_tags as string[]) || [],
        createdAt: row.duplicate_created_at as Date,
      };

      // Determine match type
      const phoneMatch = contact.phone && duplicate.phone && contact.phone === duplicate.phone;
      const emailMatch = contact.email && duplicate.email && contact.email === duplicate.email;
      const matchType = phoneMatch && emailMatch ? 'both' : phoneMatch ? 'phone' : 'email';

      duplicateGroups.push({
        contact,
        duplicates: [duplicate],
        matchType,
      });

      seenIds.add(contactId);
      seenIds.add(duplicateId);
    }

    return { duplicates: duplicateGroups };
  },

  // Merge contacts - keep the primary contact and merge data from secondary contacts
  async mergeContacts(
    primaryId: string,
    secondaryIds: string[],
    tenantId: string,
    mergeOptions: {
      keepPrimaryName?: boolean;
      keepPrimaryPhone?: boolean;
      keepPrimaryEmail?: boolean;
      mergeTags?: boolean;
    } = {},
  ) {
    const {
      keepPrimaryName = true,
      keepPrimaryPhone = true,
      keepPrimaryEmail = true,
      mergeTags = true,
    } = mergeOptions;

    const primary = await this.findById(primaryId, tenantId);
    if (!primary) return null;

    // Gather all secondary contacts
    const secondaries = await Promise.all(secondaryIds.map((id) => this.findById(id, tenantId)));
    const validSecondaries = secondaries.filter(Boolean);

    if (validSecondaries.length === 0) return primary;

    // Merge data
    const updateData: UpdateContactData = {};

    // Name
    if (!keepPrimaryName) {
      const nameFromSecondary = validSecondaries.find((s) => s?.name)?.name;
      if (nameFromSecondary) updateData.name = nameFromSecondary;
    }

    // Phone
    if (!keepPrimaryPhone || !primary.phone) {
      const phoneFromSecondary = validSecondaries.find((s) => s?.phone)?.phone;
      if (phoneFromSecondary) updateData.phone = phoneFromSecondary;
    }

    // Email
    if (!keepPrimaryEmail || !primary.email) {
      const emailFromSecondary = validSecondaries.find((s) => s?.email)?.email;
      if (emailFromSecondary) updateData.email = emailFromSecondary;
    }

    // Tags
    if (mergeTags) {
      const allTags = new Set<string>((primary.tags as string[]) || []);
      for (const secondary of validSecondaries) {
        const secondaryTags = (secondary?.tags as string[]) || [];
        for (const tag of secondaryTags) {
          allTags.add(tag);
        }
      }
      updateData.tags = Array.from(allTags);
    }

    // Custom fields (merge without overwriting)
    const mergedCustomFields = { ...((primary.customFields as Record<string, unknown>) || {}) };
    for (const secondary of validSecondaries) {
      const secondaryFields = (secondary?.customFields as Record<string, unknown>) || {};
      for (const [key, value] of Object.entries(secondaryFields)) {
        if (!(key in mergedCustomFields)) {
          mergedCustomFields[key] = value;
        }
      }
    }
    updateData.customFields = mergedCustomFields;

    // Update primary contact
    const updated = await this.update(primaryId, tenantId, updateData);

    // Soft delete secondary contacts
    await Promise.all(secondaryIds.map((id) => this.delete(id, tenantId)));

    return updated;
  },
};
