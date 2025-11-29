import { and, eq } from 'drizzle-orm';
import { db, schema } from '../lib/db';

const { users, tenants } = schema;

export interface CreateUserData {
  tenantId: string;
  email: string;
  passwordHash?: string;
  name: string;
  avatarUrl?: string;
  role?: 'owner' | 'admin' | 'agent';
}

export interface UpdateUserData {
  name?: string;
  avatarUrl?: string;
  role?: 'owner' | 'admin' | 'agent';
  isActive?: boolean;
  passwordHash?: string;
}

export const usersService = {
  async findAll(tenantId: string) {
    const data = await db
      .select({
        id: users.id,
        tenantId: users.tenantId,
        email: users.email,
        name: users.name,
        avatarUrl: users.avatarUrl,
        role: users.role,
        isActive: users.isActive,
        lastSeenAt: users.lastSeenAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.tenantId, tenantId));

    return { users: data };
  },

  async findById(id: string, tenantId: string) {
    const result = await db
      .select({
        id: users.id,
        tenantId: users.tenantId,
        email: users.email,
        name: users.name,
        avatarUrl: users.avatarUrl,
        role: users.role,
        isActive: users.isActive,
        emailVerifiedAt: users.emailVerifiedAt,
        lastSeenAt: users.lastSeenAt,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(and(eq(users.id, id), eq(users.tenantId, tenantId)))
      .limit(1);

    return result[0] || null;
  },

  async findByEmail(email: string) {
    const result = await db
      .select({
        id: users.id,
        tenantId: users.tenantId,
        email: users.email,
        passwordHash: users.passwordHash,
        name: users.name,
        avatarUrl: users.avatarUrl,
        role: users.role,
        isActive: users.isActive,
        emailVerifiedAt: users.emailVerifiedAt,
        tenant: {
          id: tenants.id,
          name: tenants.name,
          slug: tenants.slug,
        },
      })
      .from(users)
      .leftJoin(tenants, eq(users.tenantId, tenants.id))
      .where(eq(users.email, email))
      .limit(1);

    return result[0] || null;
  },

  async create(data: CreateUserData) {
    const result = await db
      .insert(users)
      .values({
        tenantId: data.tenantId,
        email: data.email,
        passwordHash: data.passwordHash,
        name: data.name,
        avatarUrl: data.avatarUrl,
        role: data.role || 'agent',
      })
      .returning({
        id: users.id,
        tenantId: users.tenantId,
        email: users.email,
        name: users.name,
        avatarUrl: users.avatarUrl,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
      });

    return result[0];
  },

  async update(id: string, tenantId: string, data: UpdateUserData) {
    const result = await db
      .update(users)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(eq(users.id, id), eq(users.tenantId, tenantId)))
      .returning({
        id: users.id,
        tenantId: users.tenantId,
        email: users.email,
        name: users.name,
        avatarUrl: users.avatarUrl,
        role: users.role,
        isActive: users.isActive,
        updatedAt: users.updatedAt,
      });

    return result[0] || null;
  },

  async updateLastSeen(id: string) {
    await db
      .update(users)
      .set({
        lastSeenAt: new Date(),
      })
      .where(eq(users.id, id));
  },

  async deactivate(id: string, tenantId: string) {
    return this.update(id, tenantId, { isActive: false });
  },

  async activate(id: string, tenantId: string) {
    return this.update(id, tenantId, { isActive: true });
  },
};
