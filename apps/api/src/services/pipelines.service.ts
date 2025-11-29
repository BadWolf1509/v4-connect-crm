import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { db, schema } from '../lib/db';

const { pipelines, stages, deals } = schema;

export interface CreatePipelineData {
  tenantId: string;
  name: string;
  isDefault?: boolean;
  stages?: Array<{
    name: string;
    color?: string;
    order: number;
  }>;
}

export interface UpdatePipelineData {
  name?: string;
  isDefault?: boolean;
}

export interface CreateStageData {
  pipelineId: string;
  name: string;
  color?: string;
  order: number;
}

export interface UpdateStageData {
  name?: string;
  color?: string;
  order?: number;
}

export const pipelinesService = {
  async findAll(tenantId: string) {
    const pipelinesData = await db
      .select()
      .from(pipelines)
      .where(eq(pipelines.tenantId, tenantId))
      .orderBy(desc(pipelines.createdAt));

    // Get stages for each pipeline with deal counts
    const pipelinesWithStages = await Promise.all(
      pipelinesData.map(async (pipeline) => {
        const stagesData = await db
          .select({
            id: stages.id,
            name: stages.name,
            color: stages.color,
            order: stages.order,
            dealCount: sql<number>`count(${deals.id})::int`,
          })
          .from(stages)
          .leftJoin(deals, eq(stages.id, deals.stageId))
          .where(eq(stages.pipelineId, pipeline.id))
          .groupBy(stages.id)
          .orderBy(asc(stages.order));

        return {
          ...pipeline,
          stages: stagesData,
        };
      }),
    );

    return { pipelines: pipelinesWithStages };
  },

  async findById(id: string, tenantId: string) {
    const result = await db
      .select()
      .from(pipelines)
      .where(and(eq(pipelines.id, id), eq(pipelines.tenantId, tenantId)))
      .limit(1);

    if (!result[0]) return null;

    const stagesData = await db
      .select({
        id: stages.id,
        name: stages.name,
        color: stages.color,
        order: stages.order,
        dealCount: sql<number>`count(${deals.id})::int`,
      })
      .from(stages)
      .leftJoin(deals, eq(stages.id, deals.stageId))
      .where(eq(stages.pipelineId, id))
      .groupBy(stages.id)
      .orderBy(asc(stages.order));

    return {
      ...result[0],
      stages: stagesData,
    };
  },

  async findDefault(tenantId: string) {
    const result = await db
      .select()
      .from(pipelines)
      .where(and(eq(pipelines.tenantId, tenantId), eq(pipelines.isDefault, true)))
      .limit(1);

    return result[0] || null;
  },

  async create(data: CreatePipelineData) {
    // If this is the default, unset other defaults
    if (data.isDefault) {
      await db
        .update(pipelines)
        .set({ isDefault: false })
        .where(eq(pipelines.tenantId, data.tenantId));
    }

    const [pipeline] = await db
      .insert(pipelines)
      .values({
        tenantId: data.tenantId,
        name: data.name,
        isDefault: data.isDefault || false,
      })
      .returning();

    // Create default stages if provided
    if (data.stages && data.stages.length > 0) {
      await db.insert(stages).values(
        data.stages.map((stage) => ({
          pipelineId: pipeline.id,
          name: stage.name,
          color: stage.color || '#E50914',
          order: stage.order,
        })),
      );
    }

    return this.findById(pipeline.id, data.tenantId);
  },

  async update(id: string, tenantId: string, data: UpdatePipelineData) {
    // If setting as default, unset other defaults first
    if (data.isDefault) {
      await db.update(pipelines).set({ isDefault: false }).where(eq(pipelines.tenantId, tenantId));
    }

    const result = await db
      .update(pipelines)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(eq(pipelines.id, id), eq(pipelines.tenantId, tenantId)))
      .returning();

    if (!result[0]) return null;

    return this.findById(id, tenantId);
  },

  async delete(id: string, tenantId: string) {
    const result = await db
      .delete(pipelines)
      .where(and(eq(pipelines.id, id), eq(pipelines.tenantId, tenantId)))
      .returning();

    return result[0] || null;
  },

  // Stage operations
  async createStage(data: CreateStageData) {
    const result = await db
      .insert(stages)
      .values({
        pipelineId: data.pipelineId,
        name: data.name,
        color: data.color || '#E50914',
        order: data.order,
      })
      .returning();

    return result[0];
  },

  async updateStage(stageId: string, data: UpdateStageData) {
    const result = await db
      .update(stages)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(stages.id, stageId))
      .returning();

    return result[0] || null;
  },

  async deleteStage(stageId: string) {
    const result = await db.delete(stages).where(eq(stages.id, stageId)).returning();

    return result[0] || null;
  },

  async reorderStages(pipelineId: string, stageIds: string[]) {
    // Update each stage with new order
    await Promise.all(
      stageIds.map((stageId, index) =>
        db
          .update(stages)
          .set({ order: index, updatedAt: new Date() })
          .where(and(eq(stages.id, stageId), eq(stages.pipelineId, pipelineId))),
      ),
    );

    return true;
  },

  async getStage(stageId: string) {
    const result = await db.select().from(stages).where(eq(stages.id, stageId)).limit(1);

    return result[0] || null;
  },
};
