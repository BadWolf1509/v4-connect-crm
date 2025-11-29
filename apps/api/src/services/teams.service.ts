import { and, desc, eq, sql } from 'drizzle-orm';
import { db, schema } from '../lib/db';

const { teams, userTeams, users } = schema;

export interface CreateTeamData {
  tenantId: string;
  name: string;
  description?: string;
}

export interface UpdateTeamData {
  name?: string;
  description?: string;
}

export const teamsService = {
  async findAll(tenantId: string) {
    const teamsData = await db
      .select({
        id: teams.id,
        name: teams.name,
        description: teams.description,
        createdAt: teams.createdAt,
        updatedAt: teams.updatedAt,
        memberCount: sql<number>`count(${userTeams.userId})::int`,
      })
      .from(teams)
      .leftJoin(userTeams, eq(teams.id, userTeams.teamId))
      .where(eq(teams.tenantId, tenantId))
      .groupBy(teams.id)
      .orderBy(desc(teams.createdAt));

    return { teams: teamsData };
  },

  async findById(id: string, tenantId: string) {
    const result = await db
      .select()
      .from(teams)
      .where(and(eq(teams.id, id), eq(teams.tenantId, tenantId)))
      .limit(1);

    if (!result[0]) return null;

    // Get team members
    const members = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        avatarUrl: users.avatarUrl,
        joinedAt: userTeams.createdAt,
      })
      .from(userTeams)
      .innerJoin(users, eq(userTeams.userId, users.id))
      .where(eq(userTeams.teamId, id));

    return {
      ...result[0],
      members,
    };
  },

  async create(data: CreateTeamData) {
    const result = await db
      .insert(teams)
      .values({
        tenantId: data.tenantId,
        name: data.name,
        description: data.description,
      })
      .returning();

    return result[0];
  },

  async update(id: string, tenantId: string, data: UpdateTeamData) {
    const result = await db
      .update(teams)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(eq(teams.id, id), eq(teams.tenantId, tenantId)))
      .returning();

    return result[0] || null;
  },

  async delete(id: string, tenantId: string) {
    const result = await db
      .delete(teams)
      .where(and(eq(teams.id, id), eq(teams.tenantId, tenantId)))
      .returning();

    return result[0] || null;
  },

  async addMember(teamId: string, userId: string) {
    // Check if already a member
    const existing = await db
      .select()
      .from(userTeams)
      .where(and(eq(userTeams.teamId, teamId), eq(userTeams.userId, userId)))
      .limit(1);

    if (existing[0]) {
      return existing[0];
    }

    const result = await db
      .insert(userTeams)
      .values({
        teamId,
        userId,
      })
      .returning();

    return result[0];
  },

  async removeMember(teamId: string, userId: string) {
    const result = await db
      .delete(userTeams)
      .where(and(eq(userTeams.teamId, teamId), eq(userTeams.userId, userId)))
      .returning();

    return result[0] || null;
  },

  async getMembers(teamId: string) {
    const members = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        avatarUrl: users.avatarUrl,
        joinedAt: userTeams.createdAt,
      })
      .from(userTeams)
      .innerJoin(users, eq(userTeams.userId, users.id))
      .where(eq(userTeams.teamId, teamId));

    return members;
  },

  async getUserTeams(userId: string) {
    const userTeamsData = await db
      .select({
        id: teams.id,
        name: teams.name,
        description: teams.description,
      })
      .from(userTeams)
      .innerJoin(teams, eq(userTeams.teamId, teams.id))
      .where(eq(userTeams.userId, userId));

    return userTeamsData;
  },
};
