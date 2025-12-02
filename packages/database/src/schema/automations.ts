import { relations } from 'drizzle-orm';
import { index, jsonb, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { users } from './users';

export const automationTriggerTypeEnum = pgEnum('automation_trigger_type', [
  'message_received',
  'conversation_opened',
  'conversation_resolved',
  'contact_created',
  'deal_stage_changed',
  'deal_created',
  'tag_added',
  'tag_removed',
  'scheduled',
]);

export const automationStatusEnum = pgEnum('automation_status', ['active', 'paused', 'draft']);

export const automations = pgTable(
  'automations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    triggerType: automationTriggerTypeEnum('trigger_type').notNull(),
    triggerConfig: jsonb('trigger_config').notNull().default({}),
    conditions: jsonb('conditions').notNull().default([]),
    actions: jsonb('actions').notNull().default([]),
    status: automationStatusEnum('status').notNull().default('draft'),
    priority: text('priority').notNull().default('normal'),
    runCount: text('run_count').notNull().default('0'),
    lastRunAt: timestamp('last_run_at', { withTimezone: true }),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index('automations_tenant_idx').on(t.tenantId),
    statusIdx: index('automations_status_idx').on(t.status),
    triggerTypeIdx: index('automations_trigger_type_idx').on(t.triggerType),
  }),
);

export const automationLogs = pgTable(
  'automation_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    automationId: uuid('automation_id')
      .notNull()
      .references(() => automations.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    triggeredBy: jsonb('triggered_by').notNull().default({}),
    actionsExecuted: jsonb('actions_executed').notNull().default([]),
    status: text('status').notNull().default('success'),
    errorMessage: text('error_message'),
    duration: text('duration'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    automationIdx: index('automation_logs_automation_idx').on(t.automationId),
    tenantIdx: index('automation_logs_tenant_idx').on(t.tenantId),
    createdAtIdx: index('automation_logs_created_at_idx').on(t.createdAt),
  }),
);

export const automationsRelations = relations(automations, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [automations.tenantId],
    references: [tenants.id],
  }),
  createdByUser: one(users, {
    fields: [automations.createdBy],
    references: [users.id],
  }),
  logs: many(automationLogs),
}));

export const automationLogsRelations = relations(automationLogs, ({ one }) => ({
  automation: one(automations, {
    fields: [automationLogs.automationId],
    references: [automations.id],
  }),
  tenant: one(tenants, {
    fields: [automationLogs.tenantId],
    references: [tenants.id],
  }),
}));

export type Automation = typeof automations.$inferSelect;
export type NewAutomation = typeof automations.$inferInsert;
export type AutomationLog = typeof automationLogs.$inferSelect;
export type NewAutomationLog = typeof automationLogs.$inferInsert;

// Type definitions for automation configuration

export interface AutomationTriggerConfig {
  // For message_received
  keywords?: string[];
  matchMode?: 'contains' | 'exact' | 'starts_with';
  channelIds?: string[];

  // For deal_stage_changed
  pipelineId?: string;
  fromStageId?: string;
  toStageId?: string;

  // For tag_added/tag_removed
  tagIds?: string[];

  // For scheduled
  cron?: string;
  timezone?: string;
}

export interface AutomationCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'is_empty' | 'is_not_empty';
  value?: string;
}

export type AutomationAction =
  | { type: 'send_message'; content: string; delay?: number }
  | { type: 'add_tag'; tagId: string }
  | { type: 'remove_tag'; tagId: string }
  | { type: 'assign_user'; userId: string }
  | { type: 'assign_team'; teamId: string }
  | { type: 'move_deal'; stageId: string }
  | { type: 'create_deal'; pipelineId: string; stageId: string; title?: string }
  | { type: 'update_contact'; fields: Record<string, string> }
  | { type: 'send_webhook'; url: string; method?: string; headers?: Record<string, string> }
  | { type: 'send_email'; templateId: string; to?: string }
  | { type: 'create_notification'; title: string; body: string; userId?: string }
  | { type: 'wait'; duration: number; unit: 'seconds' | 'minutes' | 'hours' | 'days' };
