import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import type { AppType, AuthContext } from '../types/app';

export type { AuthContext, AppType };

interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string;
  avatarUrl?: string;
}

interface SessionPayload {
  user: SessionUser;
  expires: string;
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

  if (!token) {
    throw new HTTPException(401, { message: 'Invalid token' });
  }

  try {
    // Parse session token (base64 encoded JSON from Next-Auth session)
    // Decode from base64, then parse JSON
    let tokenString: string;
    try {
      tokenString = Buffer.from(token, 'base64').toString('utf-8');
    } catch {
      // If base64 decode fails, try as plain JSON
      tokenString = token;
    }

    const session = JSON.parse(tokenString) as SessionPayload;

    console.log('[Auth] Session parsed:', {
      hasUser: !!session.user,
      userId: session.user?.id,
      tenantId: session.user?.tenantId,
      expires: session.expires,
    });

    if (!session.user?.id || !session.user?.tenantId) {
      console.error('[Auth] Missing user id or tenantId');
      throw new HTTPException(401, { message: 'Invalid session' });
    }

    // Check if session is expired
    if (new Date(session.expires) < new Date()) {
      console.error('[Auth] Session expired');
      throw new HTTPException(401, { message: 'Session expired' });
    }

    c.set('auth', {
      userId: session.user.id,
      tenantId: session.user.tenantId,
      role: session.user.role || 'agent',
    });

    await next();
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error;
    }
    console.error('[Auth] Token parse error:', error);
    throw new HTTPException(401, { message: 'Invalid token format' });
  }
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
