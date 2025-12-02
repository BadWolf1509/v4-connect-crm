import { and, count, desc, eq, sql } from 'drizzle-orm';
import { db, schema } from '../lib/db';

const { automations, automationLogs } = schema;

type AutomationStatus = 'active' | 'paused' | 'draft';

interface CreateAutomationInput {
  tenantId: string;
  name: string;
  description?: string;
  triggerType: string;
  triggerConfig?: Record<string, unknown>;
  conditions?: Array<Record<string, unknown>>;
  actions?: Array<Record<string, unknown>>;
  status?: AutomationStatus;
  createdBy?: string;
}

interface UpdateAutomationInput {
  name?: string;
  description?: string;
  triggerType?: string;
  triggerConfig?: Record<string, unknown>;
  conditions?: Array<Record<string, unknown>>;
  actions?: Array<Record<string, unknown>>;
  status?: AutomationStatus;
}

export const automationsService = {
  async findAll(
    tenantId: string,
    options: {
      status?: AutomationStatus;
      triggerType?: string;
      page?: number;
      limit?: number;
    } = {},
  ) {
    const { status, triggerType, page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    const conditions = [eq(automations.tenantId, tenantId)];

    if (status) {
      conditions.push(eq(automations.status, status));
    }

    if (triggerType) {
      conditions.push(
        eq(
          automations.triggerType,
          triggerType as (typeof automations.triggerType.enumValues)[number],
        ),
      );
    }

    const [data, totalResult] = await Promise.all([
      db
        .select()
        .from(automations)
        .where(and(...conditions))
        .orderBy(desc(automations.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ total: count() })
        .from(automations)
        .where(and(...conditions)),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total: totalResult[0]?.total || 0,
        totalPages: Math.ceil((totalResult[0]?.total || 0) / limit),
      },
    };
  },

  async findById(id: string, tenantId: string) {
    const [automation] = await db
      .select()
      .from(automations)
      .where(and(eq(automations.id, id), eq(automations.tenantId, tenantId)))
      .limit(1);

    return automation || null;
  },

  async create(input: CreateAutomationInput) {
    const [automation] = await db
      .insert(automations)
      .values({
        tenantId: input.tenantId,
        name: input.name,
        description: input.description,
        triggerType: input.triggerType as (typeof automations.triggerType.enumValues)[number],
        triggerConfig: input.triggerConfig || {},
        conditions: input.conditions || [],
        actions: input.actions || [],
        status: input.status || 'draft',
        createdBy: input.createdBy,
      })
      .returning();

    return automation;
  },

  async update(id: string, tenantId: string, input: UpdateAutomationInput) {
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.triggerType !== undefined) updateData.triggerType = input.triggerType;
    if (input.triggerConfig !== undefined) updateData.triggerConfig = input.triggerConfig;
    if (input.conditions !== undefined) updateData.conditions = input.conditions;
    if (input.actions !== undefined) updateData.actions = input.actions;
    if (input.status !== undefined) updateData.status = input.status;

    const [automation] = await db
      .update(automations)
      .set(updateData)
      .where(and(eq(automations.id, id), eq(automations.tenantId, tenantId)))
      .returning();

    return automation;
  },

  async delete(id: string, tenantId: string) {
    const [automation] = await db
      .delete(automations)
      .where(and(eq(automations.id, id), eq(automations.tenantId, tenantId)))
      .returning();

    return automation;
  },

  async activate(id: string, tenantId: string) {
    return this.update(id, tenantId, { status: 'active' });
  },

  async pause(id: string, tenantId: string) {
    return this.update(id, tenantId, { status: 'paused' });
  },

  async getLogs(
    automationId: string,
    tenantId: string,
    options: { page?: number; limit?: number } = {},
  ) {
    const { page = 1, limit = 50 } = options;
    const offset = (page - 1) * limit;

    const [data, totalResult] = await Promise.all([
      db
        .select()
        .from(automationLogs)
        .where(
          and(eq(automationLogs.automationId, automationId), eq(automationLogs.tenantId, tenantId)),
        )
        .orderBy(desc(automationLogs.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ total: count() })
        .from(automationLogs)
        .where(
          and(eq(automationLogs.automationId, automationId), eq(automationLogs.tenantId, tenantId)),
        ),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total: totalResult[0]?.total || 0,
        totalPages: Math.ceil((totalResult[0]?.total || 0) / limit),
      },
    };
  },

  async getStats(tenantId: string) {
    const [totalResult, activeResult, executionsResult] = await Promise.all([
      db.select({ total: count() }).from(automations).where(eq(automations.tenantId, tenantId)),
      db
        .select({ total: count() })
        .from(automations)
        .where(and(eq(automations.tenantId, tenantId), eq(automations.status, 'active'))),
      db
        .select({
          total: count(),
          successful: sql<number>`COUNT(*) FILTER (WHERE status = 'success')`,
          failed: sql<number>`COUNT(*) FILTER (WHERE status = 'error')`,
        })
        .from(automationLogs)
        .where(eq(automationLogs.tenantId, tenantId)),
    ]);

    return {
      totalAutomations: totalResult[0]?.total || 0,
      activeAutomations: activeResult[0]?.total || 0,
      totalExecutions: executionsResult[0]?.total || 0,
      successfulExecutions: executionsResult[0]?.successful || 0,
      failedExecutions: executionsResult[0]?.failed || 0,
    };
  },
};
