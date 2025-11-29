import { relations } from 'drizzle-orm';
import { boolean, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { channels } from './channels';
import { tenants } from './tenants';

export const chatbots = pgTable('chatbots', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  channelId: uuid('channel_id').references(() => channels.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  description: text('description'),
  isActive: boolean('is_active').notNull().default(false),
  triggerType: text('trigger_type').notNull().default('keyword'), // keyword, always, schedule
  triggerConfig: jsonb('trigger_config').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const flowNodes = pgTable('flow_nodes', {
  id: uuid('id').primaryKey().defaultRandom(),
  chatbotId: uuid('chatbot_id')
    .notNull()
    .references(() => chatbots.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // start, message, condition, action, delay, end
  name: text('name'),
  config: jsonb('config').notNull().default({}),
  position: jsonb('position').notNull().default({ x: 0, y: 0 }),
  order: integer('order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const flowEdges = pgTable('flow_edges', {
  id: uuid('id').primaryKey().defaultRandom(),
  chatbotId: uuid('chatbot_id')
    .notNull()
    .references(() => chatbots.id, { onDelete: 'cascade' }),
  sourceId: uuid('source_id')
    .notNull()
    .references(() => flowNodes.id, { onDelete: 'cascade' }),
  targetId: uuid('target_id')
    .notNull()
    .references(() => flowNodes.id, { onDelete: 'cascade' }),
  label: text('label'),
  condition: jsonb('condition'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const chatbotsRelations = relations(chatbots, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [chatbots.tenantId],
    references: [tenants.id],
  }),
  channel: one(channels, {
    fields: [chatbots.channelId],
    references: [channels.id],
  }),
  nodes: many(flowNodes),
  edges: many(flowEdges),
}));

export const flowNodesRelations = relations(flowNodes, ({ one }) => ({
  chatbot: one(chatbots, {
    fields: [flowNodes.chatbotId],
    references: [chatbots.id],
  }),
}));

export const flowEdgesRelations = relations(flowEdges, ({ one }) => ({
  chatbot: one(chatbots, {
    fields: [flowEdges.chatbotId],
    references: [chatbots.id],
  }),
  source: one(flowNodes, {
    fields: [flowEdges.sourceId],
    references: [flowNodes.id],
  }),
  target: one(flowNodes, {
    fields: [flowEdges.targetId],
    references: [flowNodes.id],
  }),
}));

export type Chatbot = typeof chatbots.$inferSelect;
export type NewChatbot = typeof chatbots.$inferInsert;
export type FlowNode = typeof flowNodes.$inferSelect;
export type NewFlowNode = typeof flowNodes.$inferInsert;
export type FlowEdge = typeof flowEdges.$inferSelect;
export type NewFlowEdge = typeof flowEdges.$inferInsert;
