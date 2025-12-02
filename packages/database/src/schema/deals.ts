import { relations } from 'drizzle-orm';
import {
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { contacts } from './contacts';
import { pipelines, stages } from './pipelines';
import { tenants } from './tenants';
import { users } from './users';

export const dealStatusEnum = pgEnum('deal_status', ['open', 'won', 'lost']);

export const dealHistoryTypeEnum = pgEnum('deal_history_type', [
  'created',
  'stage_changed',
  'status_changed',
  'assignee_changed',
  'value_changed',
  'field_updated',
  'note_added',
  'activity_added',
]);

export const deals = pgTable(
  'deals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    pipelineId: uuid('pipeline_id')
      .notNull()
      .references(() => pipelines.id, { onDelete: 'cascade' }),
    stageId: uuid('stage_id')
      .notNull()
      .references(() => stages.id, { onDelete: 'cascade' }),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contacts.id, { onDelete: 'cascade' }),
    assigneeId: uuid('assignee_id').references(() => users.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    value: numeric('value', { precision: 12, scale: 2 }),
    currency: text('currency').notNull().default('BRL'),
    status: dealStatusEnum('status').notNull().default('open'),
    order: integer('order').notNull().default(0),
    expectedCloseDate: timestamp('expected_close_date', { withTimezone: true }),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    lostReason: text('lost_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index('deals_tenant_idx').on(t.tenantId),
    stageIdx: index('deals_stage_idx').on(t.stageId),
    statusIdx: index('deals_status_idx').on(t.status),
  }),
);

export const activities = pgTable('activities', {
  id: uuid('id').primaryKey().defaultRandom(),
  dealId: uuid('deal_id')
    .notNull()
    .references(() => deals.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  type: text('type').notNull(), // call, meeting, email, task, note
  title: text('title').notNull(),
  description: text('description'),
  dueAt: timestamp('due_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const dealHistory = pgTable(
  'deal_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    dealId: uuid('deal_id')
      .notNull()
      .references(() => deals.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    type: dealHistoryTypeEnum('type').notNull(),
    previousValue: jsonb('previous_value'),
    newValue: jsonb('new_value'),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    dealIdx: index('deal_history_deal_idx').on(t.dealId),
    typeIdx: index('deal_history_type_idx').on(t.type),
    createdAtIdx: index('deal_history_created_at_idx').on(t.createdAt),
  }),
);

export const dealsRelations = relations(deals, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [deals.tenantId],
    references: [tenants.id],
  }),
  pipeline: one(pipelines, {
    fields: [deals.pipelineId],
    references: [pipelines.id],
  }),
  stage: one(stages, {
    fields: [deals.stageId],
    references: [stages.id],
  }),
  contact: one(contacts, {
    fields: [deals.contactId],
    references: [contacts.id],
  }),
  assignee: one(users, {
    fields: [deals.assigneeId],
    references: [users.id],
  }),
  activities: many(activities),
  history: many(dealHistory),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  deal: one(deals, {
    fields: [activities.dealId],
    references: [deals.id],
  }),
  user: one(users, {
    fields: [activities.userId],
    references: [users.id],
  }),
}));

export const dealHistoryRelations = relations(dealHistory, ({ one }) => ({
  deal: one(deals, {
    fields: [dealHistory.dealId],
    references: [deals.id],
  }),
  user: one(users, {
    fields: [dealHistory.userId],
    references: [users.id],
  }),
}));

export type Deal = typeof deals.$inferSelect;
export type NewDeal = typeof deals.$inferInsert;
export type Activity = typeof activities.$inferSelect;
export type NewActivity = typeof activities.$inferInsert;
export type DealHistory = typeof dealHistory.$inferSelect;
export type NewDealHistory = typeof dealHistory.$inferInsert;
export type DealHistoryType = (typeof dealHistoryTypeEnum.enumValues)[number];
