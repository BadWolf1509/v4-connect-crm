import type { NewNotification } from '@v4-connect/database';
import { and, desc, eq } from 'drizzle-orm';
import { db, schema } from '../lib/db';

const { notifications } = schema;

export const notificationsService = {
  async listByUser(userId: string, tenantId: string) {
    return db
      .select()
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.tenantId, tenantId)))
      .orderBy(desc(notifications.createdAt));
  },

  async create(notification: NewNotification) {
    const [created] = await db.insert(notifications).values(notification).returning();
    return created;
  },

  async markAsRead(id: string, userId: string) {
    await db
      .update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
  },

  async markAllAsRead(userId: string) {
    await db.update(notifications).set({ read: true }).where(eq(notifications.userId, userId));
  },
};
