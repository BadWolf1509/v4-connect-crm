import { and, eq, inArray, sql } from 'drizzle-orm';
import { db, schema } from '../lib/db';

const { tags, contactTags, contacts } = schema;

export interface CreateTagData {
  tenantId: string;
  name: string;
  color?: string;
  description?: string;
}

export interface UpdateTagData {
  name?: string;
  color?: string;
  description?: string;
}

export const tagsService = {
  async findAll(tenantId: string) {
    const data = await db
      .select({
        id: tags.id,
        name: tags.name,
        color: tags.color,
        description: tags.description,
        createdAt: tags.createdAt,
        contactCount: sql<number>`(
          SELECT COUNT(*) FROM contact_tags
          WHERE contact_tags.tag_id = ${tags.id}
        )::int`,
      })
      .from(tags)
      .where(eq(tags.tenantId, tenantId))
      .orderBy(tags.name);

    return { tags: data };
  },

  async findById(id: string, tenantId: string) {
    const result = await db
      .select()
      .from(tags)
      .where(and(eq(tags.id, id), eq(tags.tenantId, tenantId)))
      .limit(1);

    return result[0] || null;
  },

  async findByName(name: string, tenantId: string) {
    const result = await db
      .select()
      .from(tags)
      .where(and(eq(tags.name, name.toLowerCase()), eq(tags.tenantId, tenantId)))
      .limit(1);

    return result[0] || null;
  },

  async create(data: CreateTagData) {
    const result = await db
      .insert(tags)
      .values({
        tenantId: data.tenantId,
        name: data.name.toLowerCase(),
        color: data.color || '#6B7280',
        description: data.description,
      })
      .returning();

    return result[0];
  },

  async update(id: string, tenantId: string, data: UpdateTagData) {
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (data.name !== undefined) updateData.name = data.name.toLowerCase();
    if (data.color !== undefined) updateData.color = data.color;
    if (data.description !== undefined) updateData.description = data.description;

    const result = await db
      .update(tags)
      .set(updateData)
      .where(and(eq(tags.id, id), eq(tags.tenantId, tenantId)))
      .returning();

    return result[0] || null;
  },

  async delete(id: string, tenantId: string) {
    const result = await db
      .delete(tags)
      .where(and(eq(tags.id, id), eq(tags.tenantId, tenantId)))
      .returning();

    return result[0] || null;
  },

  // Contact-Tag operations
  async getContactTags(contactId: string, tenantId: string) {
    const data = await db
      .select({
        id: tags.id,
        name: tags.name,
        color: tags.color,
      })
      .from(contactTags)
      .innerJoin(tags, eq(contactTags.tagId, tags.id))
      .where(and(eq(contactTags.contactId, contactId), eq(tags.tenantId, tenantId)));

    return data;
  },

  async addTagToContact(contactId: string, tagId: string) {
    // Check if already exists
    const existing = await db
      .select()
      .from(contactTags)
      .where(and(eq(contactTags.contactId, contactId), eq(contactTags.tagId, tagId)))
      .limit(1);

    if (existing.length > 0) {
      return existing[0];
    }

    const result = await db
      .insert(contactTags)
      .values({
        contactId,
        tagId,
      })
      .returning();

    return result[0];
  },

  async removeTagFromContact(contactId: string, tagId: string) {
    const result = await db
      .delete(contactTags)
      .where(and(eq(contactTags.contactId, contactId), eq(contactTags.tagId, tagId)))
      .returning();

    return result[0] || null;
  },

  async setContactTags(contactId: string, tagIds: string[]) {
    // Remove all existing tags
    await db.delete(contactTags).where(eq(contactTags.contactId, contactId));

    if (tagIds.length === 0) {
      return [];
    }

    // Add new tags
    const values = tagIds.map((tagId) => ({
      contactId,
      tagId,
    }));

    const result = await db.insert(contactTags).values(values).returning();

    return result;
  },

  async getContactsByTag(tagId: string, tenantId: string) {
    const data = await db
      .select({
        id: contacts.id,
        name: contacts.name,
        phone: contacts.phone,
        email: contacts.email,
        avatarUrl: contacts.avatarUrl,
      })
      .from(contactTags)
      .innerJoin(contacts, eq(contactTags.contactId, contacts.id))
      .where(and(eq(contactTags.tagId, tagId), eq(contacts.tenantId, tenantId)));

    return { contacts: data };
  },

  async bulkAddTagToContacts(tagId: string, contactIds: string[]) {
    if (contactIds.length === 0) return [];

    // Get existing relationships
    const existing = await db
      .select({ contactId: contactTags.contactId })
      .from(contactTags)
      .where(and(eq(contactTags.tagId, tagId), inArray(contactTags.contactId, contactIds)));

    const existingIds = new Set(existing.map((e) => e.contactId));
    const newContactIds = contactIds.filter((id) => !existingIds.has(id));

    if (newContactIds.length === 0) return [];

    const values = newContactIds.map((contactId) => ({
      contactId,
      tagId,
    }));

    const result = await db.insert(contactTags).values(values).returning();

    return result;
  },

  async bulkRemoveTagFromContacts(tagId: string, contactIds: string[]) {
    if (contactIds.length === 0) return [];

    const result = await db
      .delete(contactTags)
      .where(and(eq(contactTags.tagId, tagId), inArray(contactTags.contactId, contactIds)))
      .returning();

    return result;
  },
};
