import { eq, and, desc, sql, asc } from 'drizzle-orm';
import { db, schema } from '../lib/db';

const { deals, pipelines, stages, contacts, users, activities } = schema;

export interface DealFilters {
  tenantId: string;
  pipelineId?: string;
  stageId?: string;
  assigneeId?: string;
  status?: 'open' | 'won' | 'lost';
  page?: number;
  limit?: number;
}

export interface CreateDealData {
  tenantId: string;
  pipelineId: string;
  stageId: string;
  contactId: string;
  assigneeId?: string;
  title: string;
  value?: string;
  currency?: string;
  expectedCloseDate?: Date;
}

export interface UpdateDealData {
  stageId?: string;
  assigneeId?: string | null;
  title?: string;
  value?: string;
  currency?: string;
  status?: 'open' | 'won' | 'lost';
  order?: number;
  expectedCloseDate?: Date | null;
  lostReason?: string;
}

export interface CreateActivityData {
  dealId: string;
  userId?: string;
  type: string;
  title: string;
  description?: string;
  dueAt?: Date;
}

export const dealsService = {
  async findAll(filters: DealFilters) {
    const { tenantId, pipelineId, stageId, assigneeId, status, page = 1, limit = 50 } = filters;
    const offset = (page - 1) * limit;

    const conditions = [eq(deals.tenantId, tenantId)];

    if (pipelineId) {
      conditions.push(eq(deals.pipelineId, pipelineId));
    }

    if (stageId) {
      conditions.push(eq(deals.stageId, stageId));
    }

    if (assigneeId) {
      conditions.push(eq(deals.assigneeId, assigneeId));
    }

    if (status) {
      conditions.push(eq(deals.status, status));
    }

    const [data, countResult] = await Promise.all([
      db
        .select({
          id: deals.id,
          tenantId: deals.tenantId,
          pipelineId: deals.pipelineId,
          stageId: deals.stageId,
          title: deals.title,
          value: deals.value,
          currency: deals.currency,
          status: deals.status,
          order: deals.order,
          expectedCloseDate: deals.expectedCloseDate,
          closedAt: deals.closedAt,
          createdAt: deals.createdAt,
          updatedAt: deals.updatedAt,
          contact: {
            id: contacts.id,
            name: contacts.name,
            email: contacts.email,
            phone: contacts.phone,
          },
          assignee: {
            id: users.id,
            name: users.name,
            email: users.email,
          },
          stage: {
            id: stages.id,
            name: stages.name,
            color: stages.color,
          },
        })
        .from(deals)
        .leftJoin(contacts, eq(deals.contactId, contacts.id))
        .leftJoin(users, eq(deals.assigneeId, users.id))
        .leftJoin(stages, eq(deals.stageId, stages.id))
        .where(and(...conditions))
        .orderBy(asc(deals.order), desc(deals.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(deals)
        .where(and(...conditions)),
    ]);

    const total = Number(countResult[0]?.count || 0);

    return {
      deals: data,
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
      .select({
        id: deals.id,
        tenantId: deals.tenantId,
        pipelineId: deals.pipelineId,
        stageId: deals.stageId,
        title: deals.title,
        value: deals.value,
        currency: deals.currency,
        status: deals.status,
        order: deals.order,
        expectedCloseDate: deals.expectedCloseDate,
        closedAt: deals.closedAt,
        lostReason: deals.lostReason,
        createdAt: deals.createdAt,
        updatedAt: deals.updatedAt,
        contact: {
          id: contacts.id,
          name: contacts.name,
          email: contacts.email,
          phone: contacts.phone,
          avatarUrl: contacts.avatarUrl,
        },
        assignee: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
        stage: {
          id: stages.id,
          name: stages.name,
          color: stages.color,
        },
        pipeline: {
          id: pipelines.id,
          name: pipelines.name,
        },
      })
      .from(deals)
      .leftJoin(contacts, eq(deals.contactId, contacts.id))
      .leftJoin(users, eq(deals.assigneeId, users.id))
      .leftJoin(stages, eq(deals.stageId, stages.id))
      .leftJoin(pipelines, eq(deals.pipelineId, pipelines.id))
      .where(and(eq(deals.id, id), eq(deals.tenantId, tenantId)))
      .limit(1);

    return result[0] || null;
  },

  async create(data: CreateDealData) {
    // Get max order in the stage
    const maxOrderResult = await db
      .select({ maxOrder: sql<number>`coalesce(max(${deals.order}), -1)` })
      .from(deals)
      .where(eq(deals.stageId, data.stageId));

    const nextOrder = (maxOrderResult[0]?.maxOrder ?? -1) + 1;

    const result = await db
      .insert(deals)
      .values({
        tenantId: data.tenantId,
        pipelineId: data.pipelineId,
        stageId: data.stageId,
        contactId: data.contactId,
        assigneeId: data.assigneeId,
        title: data.title,
        value: data.value,
        currency: data.currency || 'BRL',
        order: nextOrder,
        expectedCloseDate: data.expectedCloseDate,
      })
      .returning();

    return this.findById(result[0].id, data.tenantId);
  },

  async update(id: string, tenantId: string, data: UpdateDealData) {
    const updateData: Record<string, unknown> = {
      ...data,
      updatedAt: new Date(),
    };

    // If marking as won/lost, set closedAt
    if (data.status === 'won' || data.status === 'lost') {
      updateData.closedAt = new Date();
    } else if (data.status === 'open') {
      updateData.closedAt = null;
    }

    const result = await db
      .update(deals)
      .set(updateData)
      .where(and(eq(deals.id, id), eq(deals.tenantId, tenantId)))
      .returning();

    if (!result[0]) return null;

    return this.findById(id, tenantId);
  },

  async delete(id: string, tenantId: string) {
    const result = await db
      .delete(deals)
      .where(and(eq(deals.id, id), eq(deals.tenantId, tenantId)))
      .returning();

    return result[0] || null;
  },

  async moveToStage(id: string, tenantId: string, stageId: string, order?: number) {
    // Get max order in target stage if order not specified
    let newOrder = order;
    if (newOrder === undefined) {
      const maxOrderResult = await db
        .select({ maxOrder: sql<number>`coalesce(max(${deals.order}), -1)` })
        .from(deals)
        .where(eq(deals.stageId, stageId));

      newOrder = (maxOrderResult[0]?.maxOrder ?? -1) + 1;
    }

    return this.update(id, tenantId, {
      stageId,
      order: newOrder,
    });
  },

  async markAsWon(id: string, tenantId: string) {
    return this.update(id, tenantId, {
      status: 'won',
    });
  },

  async markAsLost(id: string, tenantId: string, reason?: string) {
    return this.update(id, tenantId, {
      status: 'lost',
      lostReason: reason,
    });
  },

  async reopen(id: string, tenantId: string) {
    return this.update(id, tenantId, {
      status: 'open',
    });
  },

  // Activities
  async getActivities(dealId: string) {
    const data = await db
      .select({
        id: activities.id,
        type: activities.type,
        title: activities.title,
        description: activities.description,
        dueAt: activities.dueAt,
        completedAt: activities.completedAt,
        createdAt: activities.createdAt,
        user: {
          id: users.id,
          name: users.name,
        },
      })
      .from(activities)
      .leftJoin(users, eq(activities.userId, users.id))
      .where(eq(activities.dealId, dealId))
      .orderBy(desc(activities.createdAt));

    return data;
  },

  async createActivity(data: CreateActivityData) {
    const result = await db
      .insert(activities)
      .values({
        dealId: data.dealId,
        userId: data.userId,
        type: data.type,
        title: data.title,
        description: data.description,
        dueAt: data.dueAt,
      })
      .returning();

    return result[0];
  },

  async completeActivity(activityId: string) {
    const result = await db
      .update(activities)
      .set({
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(activities.id, activityId))
      .returning();

    return result[0] || null;
  },

  async deleteActivity(activityId: string) {
    const result = await db
      .delete(activities)
      .where(eq(activities.id, activityId))
      .returning();

    return result[0] || null;
  },
};
