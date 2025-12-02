import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockQuickReplies = [
  { id: 'qr-1', tenantId: 'test-tenant', title: 'Hello', content: 'Hi there', category: 'General' },
];

const dbChains = {
  select: vi.fn(() => dbChains),
  from: vi.fn(() => dbChains),
  where: vi.fn(() => dbChains),
  orderBy: vi.fn(async () => mockQuickReplies),
  limit: vi.fn(() => dbChains),
  insert: vi.fn(() => ({
    values: vi.fn(() => ({
      returning: vi.fn(async () => [mockQuickReplies[0]]),
    })),
  })),
  update: vi.fn(() => ({
    set: vi.fn(() => ({
      where: vi.fn(() => ({
        returning: vi.fn(async () => [{ ...mockQuickReplies[0], title: 'Updated' }]),
      })),
    })),
  })),
  delete: vi.fn(() => ({
    where: vi.fn(() => ({
      returning: vi.fn(async () => [mockQuickReplies[0]]),
    })),
  })),
};

vi.mock('../../lib/db', () => ({
  db: dbChains,
  schema: {
    quickReplies: {
      id: 'id',
      tenantId: 'tenant_id',
      title: 'title',
      content: 'content',
      shortcut: 'shortcut',
      category: 'category',
      updatedAt: 'updated_at',
    },
  },
}));

vi.mock('../../middleware/auth', () => ({
  requireAuth: async (c: any, next: () => Promise<void>) => {
    c.set('auth', { tenantId: 'test-tenant', userId: 'user-1', role: 'admin' });
    await next();
  },
}));

const { quickRepliesRoutes } = await import('../../routes/quick-replies');

describe('Quick Replies Routes', () => {
  let app: Hono;

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono();
    app.route('/quick-replies', quickRepliesRoutes);
  });

  it('lists quick replies', async () => {
    const res = await app.request('/quick-replies', { method: 'GET' });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.quickReplies).toHaveLength(1);
  });

  it('creates a quick reply', async () => {
    const res = await app.request('/quick-replies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Hi', content: 'Hello', category: 'Geral' }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.title).toBe('Hello');
  });

  it('updates a quick reply', async () => {
    const res = await app.request('/quick-replies/qr-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Updated' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.title).toBe('Updated');
  });

  it('deletes a quick reply', async () => {
    const res = await app.request('/quick-replies/qr-1', { method: 'DELETE' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
