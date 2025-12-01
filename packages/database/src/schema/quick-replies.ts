import { relations } from 'drizzle-orm';
import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const quickReplies = pgTable(
  'quick_replies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    content: text('content').notNull(),
    shortcut: text('shortcut'),
    category: text('category').default('Geral'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('quick_replies_tenant_idx').on(table.tenantId),
    index('quick_replies_category_idx').on(table.category),
    index('quick_replies_shortcut_idx').on(table.shortcut),
  ],
);

export const quickRepliesRelations = relations(quickReplies, ({ one }) => ({
  tenant: one(tenants, {
    fields: [quickReplies.tenantId],
    references: [tenants.id],
  }),
}));
