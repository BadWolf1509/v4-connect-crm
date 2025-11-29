import { pgTable, text, timestamp, uuid, jsonb, index, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants } from './tenants';
import { users } from './users';
import { teams } from './teams';
import { channels, inboxes } from './channels';
import { contacts } from './contacts';

export const conversationStatusEnum = pgEnum('conversation_status', [
  'pending',
  'open',
  'resolved',
  'snoozed',
]);

export const conversations = pgTable(
  'conversations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    channelId: uuid('channel_id')
      .notNull()
      .references(() => channels.id, { onDelete: 'cascade' }),
    inboxId: uuid('inbox_id').references(() => inboxes.id, { onDelete: 'set null' }),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contacts.id, { onDelete: 'cascade' }),
    assigneeId: uuid('assignee_id').references(() => users.id, { onDelete: 'set null' }),
    teamId: uuid('team_id').references(() => teams.id, { onDelete: 'set null' }),
    status: conversationStatusEnum('status').notNull().default('pending'),
    lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
    snoozedUntil: timestamp('snoozed_until', { withTimezone: true }),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index('conversations_tenant_idx').on(t.tenantId),
    statusIdx: index('conversations_status_idx').on(t.status),
    assigneeIdx: index('conversations_assignee_idx').on(t.assigneeId),
    lastMessageIdx: index('conversations_last_message_idx').on(t.lastMessageAt),
  }),
);

export const conversationsRelations = relations(conversations, ({ one }) => ({
  tenant: one(tenants, {
    fields: [conversations.tenantId],
    references: [tenants.id],
  }),
  channel: one(channels, {
    fields: [conversations.channelId],
    references: [channels.id],
  }),
  inbox: one(inboxes, {
    fields: [conversations.inboxId],
    references: [inboxes.id],
  }),
  contact: one(contacts, {
    fields: [conversations.contactId],
    references: [contacts.id],
  }),
  assignee: one(users, {
    fields: [conversations.assigneeId],
    references: [users.id],
  }),
  team: one(teams, {
    fields: [conversations.teamId],
    references: [teams.id],
  }),
}));

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
