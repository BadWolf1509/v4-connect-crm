import { Hono } from 'hono';
import type { AppType } from '../../middleware/auth';

// Helper to parse JSON response with type assertion
export async function parseJson<T = Record<string, unknown>>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

// Create a test app with mocked auth middleware
export const createTestApp = () => {
  const app = new Hono<AppType>();

  // Mock auth middleware that injects test user
  app.use('*', async (c, next) => {
    c.set('auth', {
      userId: 'test-user-id',
      tenantId: 'test-tenant-id',
      role: 'admin',
    });
    await next();
  });

  return app;
};

// Helper to create authenticated request
export const createAuthHeaders = (overrides: Record<string, string> = {}) => ({
  'Content-Type': 'application/json',
  Authorization: 'Bearer test-token',
  ...overrides,
});

// Helper to make test requests
export const testRequest = async (
  app: Hono,
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown,
) => {
  const options: RequestInit = {
    method,
    headers: createAuthHeaders(),
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  return app.request(path, options);
};
