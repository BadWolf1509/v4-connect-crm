import { createServer } from 'http';
import { Server } from 'socket.io';
import { Redis } from 'ioredis';
import { createAdapter } from '@socket.io/redis-adapter';

const httpServer = createServer();

// Redis for Socket.IO adapter (horizontal scaling)
const pubClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const subClient = pubClient.duplicate();

const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  },
  adapter: createAdapter(pubClient, subClient),
});

// Authentication middleware
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error('Authentication required'));
  }

  try {
    // TODO: Validate JWT token
    // const decoded = await verifyToken(token);

    // Mock user data
    socket.data.userId = 'user-id';
    socket.data.tenantId = 'tenant-id';
    socket.data.role = 'agent';

    next();
  } catch (error) {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  const { userId, tenantId } = socket.data;

  console.log(`User ${userId} connected (tenant: ${tenantId})`);

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
export const emitNewMessage = (conversationId: string, message: any) => {
  io.to(`conversation:${conversationId}`).emit('message:new', message);
};

export const emitMessageUpdate = (conversationId: string, message: any) => {
  io.to(`conversation:${conversationId}`).emit('message:update', message);
};

export const emitConversationUpdate = (tenantId: string, conversation: any) => {
  io.to(`tenant:${tenantId}`).emit('conversation:update', conversation);
};

export const emitNewConversation = (tenantId: string, conversation: any) => {
  io.to(`tenant:${tenantId}`).emit('conversation:new', conversation);
};

export const emitNotification = (userId: string, notification: any) => {
  io.to(`user:${userId}`).emit('notification', notification);
};

// Redis subscriber for events from API/Workers
const eventSubscriber = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

eventSubscriber.subscribe('socket:events', (err) => {
  if (err) {
    console.error('Failed to subscribe to socket events:', err);
    return;
  }
  console.log('Subscribed to socket events channel');
});

eventSubscriber.on('message', (channel, message) => {
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

const port = parseInt(process.env.PORT || '3002', 10);

httpServer.listen(port, () => {
  console.log(`🔌 V4 Connect WebSocket running on http://localhost:${port}`);
});
