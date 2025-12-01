import { db } from '@v4-connect/database';
import { chatbots, flowEdges, flowNodes } from '@v4-connect/database/schema';
import { and, desc, eq } from 'drizzle-orm';

export const chatbotsService = {
  async findAll(tenantId: string) {
    const result = await db.query.chatbots.findMany({
      where: eq(chatbots.tenantId, tenantId),
      with: {
        channel: true,
        nodes: true,
      },
      orderBy: [desc(chatbots.createdAt)],
    });

    return {
      chatbots: result,
      total: result.length,
    };
  },

  async findById(id: string, tenantId: string) {
    const chatbot = await db.query.chatbots.findFirst({
      where: and(eq(chatbots.id, id), eq(chatbots.tenantId, tenantId)),
      with: {
        channel: true,
        nodes: true,
        edges: true,
      },
    });

    return chatbot;
  },

  async create(data: {
    tenantId: string;
    name: string;
    description?: string;
    channelId?: string;
    triggerType?: string;
    triggerConfig?: Record<string, unknown>;
  }) {
    const [chatbot] = await db
      .insert(chatbots)
      .values({
        tenantId: data.tenantId,
        name: data.name,
        description: data.description,
        channelId: data.channelId,
        triggerType: data.triggerType || 'keyword',
        triggerConfig: data.triggerConfig || {},
      })
      .returning();

    // Create default start node
    await db.insert(flowNodes).values({
      chatbotId: chatbot.id,
      type: 'start',
      name: 'Início',
      config: {},
      position: { x: 250, y: 50 },
      order: 0,
    });

    return chatbot;
  },

  async update(
    id: string,
    tenantId: string,
    data: {
      name?: string;
      description?: string;
      channelId?: string | null;
      isActive?: boolean;
      triggerType?: string;
      triggerConfig?: Record<string, unknown>;
    },
  ) {
    const [chatbot] = await db
      .update(chatbots)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(eq(chatbots.id, id), eq(chatbots.tenantId, tenantId)))
      .returning();

    return chatbot;
  },

  async delete(id: string, tenantId: string) {
    await db.delete(chatbots).where(and(eq(chatbots.id, id), eq(chatbots.tenantId, tenantId)));
  },

  async toggleActive(id: string, tenantId: string, isActive: boolean) {
    const [chatbot] = await db
      .update(chatbots)
      .set({
        isActive,
        updatedAt: new Date(),
      })
      .where(and(eq(chatbots.id, id), eq(chatbots.tenantId, tenantId)))
      .returning();

    return chatbot;
  },

  // Flow nodes management
  async addNode(
    chatbotId: string,
    data: {
      type: string;
      name?: string;
      config?: Record<string, unknown>;
      position?: { x: number; y: number };
    },
  ) {
    const [node] = await db
      .insert(flowNodes)
      .values({
        chatbotId,
        type: data.type,
        name: data.name,
        config: data.config || {},
        position: data.position || { x: 0, y: 0 },
      })
      .returning();

    return node;
  },

  async updateNode(
    nodeId: string,
    data: {
      name?: string;
      config?: Record<string, unknown>;
      position?: { x: number; y: number };
    },
  ) {
    const [node] = await db
      .update(flowNodes)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(flowNodes.id, nodeId))
      .returning();

    return node;
  },

  async deleteNode(nodeId: string) {
    await db.delete(flowNodes).where(eq(flowNodes.id, nodeId));
  },

  // Flow edges management
  async addEdge(
    chatbotId: string,
    data: {
      sourceId: string;
      targetId: string;
      label?: string;
      condition?: Record<string, unknown>;
    },
  ) {
    const [edge] = await db
      .insert(flowEdges)
      .values({
        chatbotId,
        sourceId: data.sourceId,
        targetId: data.targetId,
        label: data.label,
        condition: data.condition,
      })
      .returning();

    return edge;
  },

  async deleteEdge(edgeId: string) {
    await db.delete(flowEdges).where(eq(flowEdges.id, edgeId));
  },
};
