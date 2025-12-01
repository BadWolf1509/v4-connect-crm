import { randomBytes } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { db, schema } from '../lib/db';

const { invites, users, tenants } = schema;

export interface CreateInviteData {
  tenantId: string;
  email: string;
  role: 'owner' | 'admin' | 'agent';
  invitedById: string;
}

export const invitesService = {
  async findAll(tenantId: string) {
    const data = await db
      .select({
        id: invites.id,
        email: invites.email,
        role: invites.role,
        status: invites.status,
        expiresAt: invites.expiresAt,
        createdAt: invites.createdAt,
        invitedBy: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(invites)
      .leftJoin(users, eq(invites.invitedById, users.id))
      .where(eq(invites.tenantId, tenantId))
      .orderBy(invites.createdAt);

    return { invites: data };
  },

  async findById(id: string, tenantId: string) {
    const result = await db
      .select()
      .from(invites)
      .where(and(eq(invites.id, id), eq(invites.tenantId, tenantId)))
      .limit(1);

    return result[0] || null;
  },

  async findByToken(token: string) {
    const result = await db
      .select({
        invite: invites,
        tenant: {
          id: tenants.id,
          name: tenants.name,
          slug: tenants.slug,
        },
      })
      .from(invites)
      .leftJoin(tenants, eq(invites.tenantId, tenants.id))
      .where(eq(invites.token, token))
      .limit(1);

    return result[0] || null;
  },

  async findPendingByEmail(email: string, tenantId: string) {
    const result = await db
      .select()
      .from(invites)
      .where(
        and(
          eq(invites.email, email.toLowerCase()),
          eq(invites.tenantId, tenantId),
          eq(invites.status, 'pending'),
        ),
      )
      .limit(1);

    return result[0] || null;
  },

  async create(data: CreateInviteData) {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    const result = await db
      .insert(invites)
      .values({
        tenantId: data.tenantId,
        email: data.email.toLowerCase(),
        role: data.role,
        token,
        invitedById: data.invitedById,
        expiresAt,
      })
      .returning();

    return result[0];
  },

  async accept(token: string, _userId: string) {
    const result = await db
      .update(invites)
      .set({
        status: 'accepted',
        acceptedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(invites.token, token), eq(invites.status, 'pending')))
      .returning();

    return result[0] || null;
  },

  async revoke(id: string, tenantId: string) {
    const result = await db
      .update(invites)
      .set({
        status: 'revoked',
        updatedAt: new Date(),
      })
      .where(and(eq(invites.id, id), eq(invites.tenantId, tenantId), eq(invites.status, 'pending')))
      .returning();

    return result[0] || null;
  },

  async resend(id: string, tenantId: string) {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const result = await db
      .update(invites)
      .set({
        token,
        expiresAt,
        updatedAt: new Date(),
      })
      .where(and(eq(invites.id, id), eq(invites.tenantId, tenantId), eq(invites.status, 'pending')))
      .returning();

    return result[0] || null;
  },

  isExpired(invite: { expiresAt: Date; status: string }) {
    return invite.status !== 'pending' || new Date() > new Date(invite.expiresAt);
  },
};
