import { pgTable, text, timestamp, uuid, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants } from './tenants';

export const contacts = pgTable(
  'contacts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    phone: text('phone'),
    email: text('email'),
    avatarUrl: text('avatar_url'),
    tags: jsonb('tags').notNull().default([]),
    customFields: jsonb('custom_fields').notNull().default({}),
    externalId: text('external_id'), // ID from WhatsApp/Instagram
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => ({
    tenantIdx: index('contacts_tenant_idx').on(t.tenantId),
    phoneIdx: index('contacts_phone_idx').on(t.phone),
    emailIdx: index('contacts_email_idx').on(t.email),
    externalIdx: index('contacts_external_idx').on(t.externalId),
  }),
);

export const contactsRelations = relations(contacts, ({ one }) => ({
  tenant: one(tenants, {
    fields: [contacts.tenantId],
    references: [tenants.id],
  }),
}));

export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;
