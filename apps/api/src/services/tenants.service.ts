import { eq } from 'drizzle-orm';
import { db, schema } from '../lib/db';

const { tenants } = schema;

export interface CreateTenantData {
  name: string;
  slug: string;
  plan?: 'free' | 'starter' | 'professional' | 'enterprise';
}

export interface UpdateTenantData {
  name?: string;
  logoUrl?: string;
  plan?: 'free' | 'starter' | 'professional' | 'enterprise';
  settings?: Record<string, unknown>;
}

export const tenantsService = {
  async findById(id: string) {
    const result = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, id))
      .limit(1);

    return result[0] || null;
  },

  async findBySlug(slug: string) {
    const result = await db
      .select()
      .from(tenants)
      .where(eq(tenants.slug, slug))
      .limit(1);

    return result[0] || null;
  },

  async create(data: CreateTenantData) {
    const result = await db
      .insert(tenants)
      .values({
        name: data.name,
        slug: data.slug,
        plan: data.plan || 'free',
      })
      .returning();

    return result[0];
  },

  async update(id: string, data: UpdateTenantData) {
    const result = await db
      .update(tenants)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, id))
      .returning();

    return result[0] || null;
  },

  async generateSlug(name: string): Promise<string> {
    const baseSlug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Check if slug exists
    let slug = baseSlug;
    let counter = 1;

    while (await this.findBySlug(slug)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  },
};
