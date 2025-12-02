import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockNotifications = [
  { id: 'n-1', userId: 'user-1', tenantId: 'test-tenant', title: 'Hi', read: false },
];

const notificationsService = {
  listByUser: vi.fn(async () => mockNotifications),
  markAsRead: vi.fn(async () => undefined),
  markAllAsRead: vi.fn(async () => undefined),
  create: vi.fn(async (data) => ({ id: 'n-2', ...data })),
};

vi.mock('../../services/notifications.service', () => ({ notificationsService }));

vi.mock('../../middleware/auth', () => ({
  requireAuth: async (c: any, next: () => Promise<void>) => {
    c.set('auth', { tenantId: 'test-tenant', userId: 'user-1', role: 'admin' });
    await next();
  },
}));

const { notificationsRoutes } = await import('../../routes/notifications');

describe('Notifications Routes', () => {
  let app: Hono;

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono();
    app.route('/notifications', notificationsRoutes);
  });

  it('lists notifications', async () => {
    const res = await app.request('/notifications', { method: 'GET' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.notifications).toHaveLength(1);
  });

  it('marks one as read', async () => {
    const res = await app.request('/notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: '123e4567-e89b-12d3-a456-426614174000' }),
    });
    expect(res.status).toBe(200);
    expect(notificationsService.markAsRead).toHaveBeenCalledWith(
      '123e4567-e89b-12d3-a456-426614174000',
      'user-1',
    );
  });

  it('marks all as read', async () => {
    const res = await app.request('/notifications/read-all', { method: 'POST' });
    expect(res.status).toBe(200);
    expect(notificationsService.markAllAsRead).toHaveBeenCalledWith('user-1');
  });

  it('creates notification with required fields', async () => {
    const res = await app.request('/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'New', userId: 'user-1' }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.title).toBe('New');
    expect(notificationsService.create).toHaveBeenCalled();
  });
});
