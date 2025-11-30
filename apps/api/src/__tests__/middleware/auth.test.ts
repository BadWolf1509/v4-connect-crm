import { Hono } from 'hono';
import { beforeEach, describe, expect, it } from 'vitest';
import { requireAuth, requireRole } from '../../middleware/auth';
import type { AppType } from '../../types/app';

describe('Auth Middleware', () => {
  describe('requireAuth', () => {
    let app: Hono<AppType>;

    beforeEach(() => {
      app = new Hono<AppType>();
      app.use('*', requireAuth);
      app.get('/protected', (c) => {
        const auth = c.get('auth');
        return c.json({ auth });
      });
    });

    const createValidToken = (overrides = {}) => {
      const session = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'admin',
          tenantId: 'tenant-123',
          ...overrides,
        },
        expires: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
      };
      return Buffer.from(JSON.stringify(session)).toString('base64');
    };

    it('should pass with valid base64 token', async () => {
      const token = createValidToken();

      const res = await app.request('/protected', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.auth.userId).toBe('user-123');
      expect(data.auth.tenantId).toBe('tenant-123');
    });

    it('should return 401 without Authorization header', async () => {
      const res = await app.request('/protected', {
        method: 'GET',
      });

      expect(res.status).toBe(401);
    });

    it('should return 401 with invalid Authorization format', async () => {
      const res = await app.request('/protected', {
        method: 'GET',
        headers: {
          Authorization: 'InvalidFormat token',
        },
      });

      expect(res.status).toBe(401);
    });

    it('should return 401 with empty token', async () => {
      const res = await app.request('/protected', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer ',
        },
      });

      expect(res.status).toBe(401);
    });

    it('should return 401 with invalid JSON token', async () => {
      const token = Buffer.from('invalid json').toString('base64');

      const res = await app.request('/protected', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(res.status).toBe(401);
    });

    it('should return 401 with missing user id', async () => {
      const session = {
        user: {
          email: 'test@example.com',
          tenantId: 'tenant-123',
        },
        expires: new Date(Date.now() + 3600000).toISOString(),
      };
      const token = Buffer.from(JSON.stringify(session)).toString('base64');

      const res = await app.request('/protected', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(res.status).toBe(401);
    });

    it('should return 401 with missing tenant id', async () => {
      const session = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
        },
        expires: new Date(Date.now() + 3600000).toISOString(),
      };
      const token = Buffer.from(JSON.stringify(session)).toString('base64');

      const res = await app.request('/protected', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(res.status).toBe(401);
    });

    it('should return 401 with expired session', async () => {
      const session = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          tenantId: 'tenant-123',
        },
        expires: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      };
      const token = Buffer.from(JSON.stringify(session)).toString('base64');

      const res = await app.request('/protected', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(res.status).toBe(401);
    });

    it('should default role to agent if not provided', async () => {
      const session = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          tenantId: 'tenant-123',
          // no role
        },
        expires: new Date(Date.now() + 3600000).toISOString(),
      };
      const token = Buffer.from(JSON.stringify(session)).toString('base64');

      const res = await app.request('/protected', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.auth.role).toBe('agent');
    });
  });

  describe('requireRole', () => {
    let app: Hono<AppType>;

    const createAuthHeader = (role: string) => {
      const session = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role,
          tenantId: 'tenant-123',
        },
        expires: new Date(Date.now() + 3600000).toISOString(),
      };
      return `Bearer ${Buffer.from(JSON.stringify(session)).toString('base64')}`;
    };

    beforeEach(() => {
      app = new Hono<AppType>();
      app.use('*', requireAuth);
      app.use('/admin/*', requireRole(['admin']));
      app.use('/manager/*', requireRole(['admin', 'manager']));
      app.get('/admin/dashboard', (c) => c.json({ message: 'Admin only' }));
      app.get('/manager/dashboard', (c) => c.json({ message: 'Manager or admin' }));
    });

    it('should allow admin to access admin route', async () => {
      const res = await app.request('/admin/dashboard', {
        method: 'GET',
        headers: {
          Authorization: createAuthHeader('admin'),
        },
      });

      expect(res.status).toBe(200);
    });

    it('should deny agent access to admin route', async () => {
      const res = await app.request('/admin/dashboard', {
        method: 'GET',
        headers: {
          Authorization: createAuthHeader('agent'),
        },
      });

      expect(res.status).toBe(403);
    });

    it('should allow admin to access manager route', async () => {
      const res = await app.request('/manager/dashboard', {
        method: 'GET',
        headers: {
          Authorization: createAuthHeader('admin'),
        },
      });

      expect(res.status).toBe(200);
    });

    it('should allow manager to access manager route', async () => {
      const res = await app.request('/manager/dashboard', {
        method: 'GET',
        headers: {
          Authorization: createAuthHeader('manager'),
        },
      });

      expect(res.status).toBe(200);
    });

    it('should deny agent access to manager route', async () => {
      const res = await app.request('/manager/dashboard', {
        method: 'GET',
        headers: {
          Authorization: createAuthHeader('agent'),
        },
      });

      expect(res.status).toBe(403);
    });
  });
});
