import { pgTable, text, timestamp, uuid, jsonb, index, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { conversations } from './conversations';
import { users } from './users';

export const messageTypeEnum = pgEnum('message_type', [
  'text',
  'image',
  'video',
  'audio',
  'document',
  'location',
  'contact',
  'sticker',
  'template',
]);

export const messageDirectionEnum = pgEnum('message_direction', ['inbound', 'outbound']);

export const messageStatusEnum = pgEnum('message_status', [
  'pending',
  'sent',
  'delivered',
  'read',
  'failed',
]);

export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    senderId: uuid('sender_id').references(() => users.id, { onDelete: 'set null' }),
    type: messageTypeEnum('type').notNull().default('text'),
    direction: messageDirectionEnum('direction').notNull(),
    content: text('content').notNull(),
    metadata: jsonb('metadata').notNull().default({}),
    status: messageStatusEnum('status').notNull().default('pending'),
    externalId: text('external_id'),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    conversationIdx: index('messages_conversation_idx').on(t.conversationId),
    createdAtIdx: index('messages_created_at_idx').on(t.createdAt),
    externalIdx: index('messages_external_idx').on(t.externalId),
  }),
);

export const attachments = pgTable('attachments', {
  id: uuid('id').primaryKey().defaultRandom(),
  messageId: uuid('message_id')
    .notNull()
    .references(() => messages.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // image, video, audio, document
  url: text('url').notNull(),
  mimeType: text('mime_type'),
  fileName: text('file_name'),
  fileSize: text('file_size'),
  thumbnail: text('thumbnail'),
  duration: text('duration'), // for audio/video
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const messagesRelations = relations(messages, ({ one, many }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
  attachments: many(attachments),
}));

export const attachmentsRelations = relations(attachments, ({ one }) => ({
  message: one(messages, {
    fields: [attachments.messageId],
    references: [messages.id],
  }),
}));

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type Attachment = typeof attachments.$inferSelect;
export type NewAttachment = typeof attachments.$inferInsert;
