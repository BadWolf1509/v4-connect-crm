import { Redis } from 'ioredis';

// Redis client for publishing socket events
const redisUrl = process.env.REDIS_URL;
let redis: Redis | null = null;

if (redisUrl) {
  try {
    redis = new Redis(redisUrl);
    console.log('Socket events service: Redis connected');
  } catch (_error) {
    console.warn('Socket events service: Redis not available, events will not be broadcast');
  }
}

type SocketEventType =
  | 'message:new'
  | 'message:update'
  | 'conversation:new'
  | 'conversation:update'
  | 'notification';

interface SocketEvent {
  type: SocketEventType;
  conversationId?: string;
  tenantId?: string;
  userId?: string;
  data: unknown;
}

async function publishEvent(event: SocketEvent): Promise<void> {
  if (!redis) {
    console.log('Socket event (no Redis):', event.type, event.conversationId || event.tenantId);
    return;
  }

  try {
    await redis.publish('socket:events', JSON.stringify(event));
  } catch (error) {
    console.error('Failed to publish socket event:', error);
  }
}

export const socketEventsService = {
  emitNewMessage: (conversationId: string, message: unknown) => {
    return publishEvent({
      type: 'message:new',
      conversationId,
      data: message,
    });
  },

  emitMessageUpdate: (conversationId: string, message: unknown) => {
    return publishEvent({
      type: 'message:update',
      conversationId,
      data: message,
    });
  },

  emitNewConversation: (tenantId: string, conversation: unknown) => {
    return publishEvent({
      type: 'conversation:new',
      tenantId,
      data: conversation,
    });
  },

  emitConversationUpdate: (tenantId: string, conversation: unknown) => {
    return publishEvent({
      type: 'conversation:update',
      tenantId,
      data: conversation,
    });
  },

  emitNotification: (userId: string, notification: unknown) => {
    return publishEvent({
      type: 'notification',
      userId,
      data: notification,
    });
  },
};
