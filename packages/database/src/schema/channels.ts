import { relations } from 'drizzle-orm';
import { boolean, jsonb, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const channelTypeEnum = pgEnum('channel_type', [
  'whatsapp',
  'instagram',
  'messenger',
  'email',
]);

export const whatsappProviderEnum = pgEnum('whatsapp_provider', ['evolution', '360dialog']);

export const channels = pgTable('channels', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  type: channelTypeEnum('type').notNull(),
  provider: whatsappProviderEnum('provider'),
  name: text('name').notNull(),
  phoneNumber: text('phone_number'),
  config: jsonb('config').notNull().default({}),
  isActive: boolean('is_active').notNull().default(true),
  connectedAt: timestamp('connected_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const inboxes = pgTable('inboxes', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  channelId: uuid('channel_id')
    .notNull()
    .references(() => channels.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  isDefault: boolean('is_default').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const channelsRelations = relations(channels, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [channels.tenantId],
    references: [tenants.id],
  }),
  inboxes: many(inboxes),
}));

export const inboxesRelations = relations(inboxes, ({ one }) => ({
  tenant: one(tenants, {
    fields: [inboxes.tenantId],
    references: [tenants.id],
  }),
  channel: one(channels, {
    fields: [inboxes.channelId],
    references: [channels.id],
  }),
}));

export type Channel = typeof channels.$inferSelect;
export type NewChannel = typeof channels.$inferInsert;
export type Inbox = typeof inboxes.$inferSelect;
export type NewInbox = typeof inboxes.$inferInsert;
