import 'dotenv/config';
import { createServer } from 'node:http';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import { jwtDecrypt } from 'jose';
import { Server } from 'socket.io';

const httpServer = createServer();

// Auth.js secret for JWT validation
const authSecret = process.env.AUTH_SECRET;
if (!authSecret) {
  console.warn('⚠️ AUTH_SECRET not configured, using mock authentication');
}

// Redis for Socket.IO adapter (horizontal scaling)
const redisUrl = process.env.REDIS_URL;
let pubClient: Redis | null = null;
let subClient: Redis | null = null;

const io = new Server(httpServer, {
  cors: {
    origin: [
      'http://localhost:3002',
      'https://v4-connect-crm-web.vercel.app',
      process.env.FRONTEND_URL || '',
    ].filter(Boolean),
    credentials: true,
  },
});

// Only use Redis adapter if REDIS_URL is configured
if (redisUrl) {
  try {
    pubClient = new Redis(redisUrl);
    subClient = pubClient.duplicate();
    io.adapter(createAdapter(pubClient, subClient));
    console.log('✅ Redis adapter connected');
  } catch (_error) {
    console.warn('⚠️ Redis not available, running without adapter (single instance mode)');
  }
} else {
  console.log('ℹ️ Running without Redis adapter (single instance mode)');
}

// JWT token validation
interface TokenPayload {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string;
  avatarUrl?: string;
}

async function verifyToken(token: string): Promise<TokenPayload | null> {
  if (!authSecret) {
    // Mock mode for development without AUTH_SECRET
    console.warn('[Auth] Using mock authentication');
    return null;
  }

  try {
    // Auth.js v5 uses encrypted JWE tokens
    // Derive key from AUTH_SECRET (same as Auth.js does internally)
    const encoder = new TextEncoder();
    const secretKey = encoder.encode(authSecret).slice(0, 32);

    const { payload } = await jwtDecrypt(token, secretKey, {
      clockTolerance: 15,
    });

    // Auth.js stores user data in the token payload
    if (payload.id && payload.tenantId) {
      return {
        id: payload.id as string,
        email: payload.email as string,
        name: payload.name as string,
        role: payload.role as string,
        tenantId: payload.tenantId as string,
        avatarUrl: payload.avatarUrl as string | undefined,
      };
    }

    return null;
  } catch (error) {
    console.error('[Auth] Token verification failed:', error);
    return null;
  }
}

// Authentication middleware
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error('Authentication required'));
  }

  try {
    const decoded = await verifyToken(token);

    if (decoded) {
      socket.data.userId = decoded.id;
      socket.data.tenantId = decoded.tenantId;
      socket.data.role = decoded.role;
      socket.data.email = decoded.email;
      socket.data.name = decoded.name;
    } else {
      // Fallback: Try to use token data directly if it's a session object
      // (Client might send session data directly in some cases)
      try {
        const sessionData = JSON.parse(token);
        if (sessionData.user?.id && sessionData.user?.tenantId) {
          socket.data.userId = sessionData.user.id;
          socket.data.tenantId = sessionData.user.tenantId;
          socket.data.role = sessionData.user.role || 'agent';
          socket.data.email = sessionData.user.email;
          socket.data.name = sessionData.user.name;
        } else {
          return next(new Error('Invalid token format'));
        }
      } catch {
        return next(new Error('Invalid token'));
      }
    }

    next();
  } catch (_error) {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  const { userId, tenantId, name } = socket.data;

  console.log(`User ${name || userId} connected (tenant: ${tenantId})`);

  // Join tenant room (for broadcast to all users in tenant)
  socket.join(`tenant:${tenantId}`);

  // Join user's personal room
  socket.join(`user:${userId}`);

  // Handle joining conversation rooms
  socket.on('conversation:join', (conversationId: string) => {
    socket.join(`conversation:${conversationId}`);
    console.log(`User ${userId} joined conversation ${conversationId}`);
  });

  // Handle leaving conversation rooms
  socket.on('conversation:leave', (conversationId: string) => {
    socket.leave(`conversation:${conversationId}`);
    console.log(`User ${userId} left conversation ${conversationId}`);
  });

  // Handle typing indicator
  socket.on('typing:start', (data: { conversationId: string }) => {
    socket.to(`conversation:${data.conversationId}`).emit('typing:start', {
      conversationId: data.conversationId,
      userId,
    });
  });

  socket.on('typing:stop', (data: { conversationId: string }) => {
    socket.to(`conversation:${data.conversationId}`).emit('typing:stop', {
      conversationId: data.conversationId,
      userId,
    });
  });

  // Handle presence
  socket.on('presence:update', (status: 'online' | 'away' | 'busy') => {
    io.to(`tenant:${tenantId}`).emit('presence:update', {
      userId,
      status,
    });
  });

  // Handle disconnect
  socket.on('disconnect', (reason) => {
    console.log(`User ${userId} disconnected: ${reason}`);

    // Notify tenant about user going offline
    io.to(`tenant:${tenantId}`).emit('presence:update', {
      userId,
      status: 'offline',
    });
  });
});

// Export io instance for use in other services
export { io };

// Event emitters for API to call
export const emitNewMessage = (conversationId: string, message: unknown) => {
  io.to(`conversation:${conversationId}`).emit('message:new', message);
};

export const emitMessageUpdate = (conversationId: string, message: unknown) => {
  io.to(`conversation:${conversationId}`).emit('message:update', message);
};

export const emitConversationUpdate = (tenantId: string, conversation: unknown) => {
  io.to(`tenant:${tenantId}`).emit('conversation:update', conversation);
};

export const emitNewConversation = (tenantId: string, conversation: unknown) => {
  io.to(`tenant:${tenantId}`).emit('conversation:new', conversation);
};

export const emitNotification = (userId: string, notification: unknown) => {
  io.to(`user:${userId}`).emit('notification', notification);
};

// Redis subscriber for events from API/Workers (only if Redis is available)
if (redisUrl) {
  const eventSubscriber = new Redis(redisUrl);

  eventSubscriber.subscribe('socket:events', (err) => {
    if (err) {
      console.error('Failed to subscribe to socket events:', err);
      return;
    }
    console.log('✅ Subscribed to socket events channel');
  });

  eventSubscriber.on('message', (_channel, message) => {
    try {
      const event = JSON.parse(message);

      switch (event.type) {
        case 'message:new':
          emitNewMessage(event.conversationId, event.data);
          break;
        case 'message:update':
          emitMessageUpdate(event.conversationId, event.data);
          break;
        case 'conversation:new':
          emitNewConversation(event.tenantId, event.data);
          break;
        case 'conversation:update':
          emitConversationUpdate(event.tenantId, event.data);
          break;
        case 'notification':
          emitNotification(event.userId, event.data);
          break;
      }
    } catch (error) {
      console.error('Error processing socket event:', error);
    }
  });
}

const port = Number.parseInt(process.env.PORT || '3003', 10);

httpServer.listen(port, () => {
  console.log(`🔌 V4 Connect WebSocket running on http://localhost:${port}`);
});
