import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';

export interface AuthContext {
  userId: string;
  tenantId: string;
  role: string;
}

export const requireAuth = createMiddleware<{
  Variables: {
    auth: AuthContext;
  };
}>(async (c, next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new HTTPException(401, { message: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];

  // TODO: Validate JWT token with Auth.js
  // For now, mock the auth context
  if (!token) {
    throw new HTTPException(401, { message: 'Invalid token' });
  }

  // Mock auth context - will be replaced with real JWT validation
  c.set('auth', {
    userId: 'user-id',
    tenantId: 'tenant-id',
    role: 'admin',
  });

  await next();
});

export const requireRole = (roles: string[]) =>
  createMiddleware<{
    Variables: {
      auth: AuthContext;
    };
  }>(async (c, next) => {
    const auth = c.get('auth');

    if (!auth || !roles.includes(auth.role)) {
      throw new HTTPException(403, { message: 'Forbidden' });
    }

    await next();
  });
