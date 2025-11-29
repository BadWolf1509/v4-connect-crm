import { Redis } from 'ioredis';

const redisUrl = process.env.REDIS_URL;

let redis: Redis | null = null;

export function getRedis(): Redis | null {
  if (!redisUrl) {
    console.warn('⚠️ REDIS_URL not configured, real-time events will not work');
    return null;
  }

  if (!redis) {
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      retryStrategy(times) {
        const delay = Math.min(times * 100, 3000);
        return delay;
      },
    });

    redis.on('connect', () => {
      console.log('✅ Redis connected');
    });

    redis.on('error', (err) => {
      console.error('❌ Redis error:', err.message);
    });
  }

  return redis;
}

// Event types for WebSocket
export interface SocketEvent {
  type:
    | 'message:new'
    | 'message:update'
    | 'conversation:new'
    | 'conversation:update'
    | 'notification';
  tenantId: string;
  conversationId?: string;
  userId?: string;
  data: unknown;
}

// Publish event to Redis channel for WebSocket server
export async function publishSocketEvent(event: SocketEvent): Promise<void> {
  const client = getRedis();

  if (!client) {
    console.log('[Redis] Skipping event publish (Redis not configured):', event.type);
    return;
  }

  try {
    await client.publish('socket:events', JSON.stringify(event));
    console.log(`[Redis] Published ${event.type} event`);
  } catch (error) {
    console.error('[Redis] Failed to publish event:', error);
  }
}

// Helper functions for common events
export async function publishNewMessage(
  tenantId: string,
  conversationId: string,
  message: unknown,
): Promise<void> {
  await publishSocketEvent({
    type: 'message:new',
    tenantId,
    conversationId,
    data: message,
  });
}

export async function publishMessageUpdate(
  tenantId: string,
  conversationId: string,
  message: unknown,
): Promise<void> {
  await publishSocketEvent({
    type: 'message:update',
    tenantId,
    conversationId,
    data: message,
  });
}

export async function publishNewConversation(
  tenantId: string,
  conversation: unknown,
): Promise<void> {
  await publishSocketEvent({
    type: 'conversation:new',
    tenantId,
    data: conversation,
  });
}

export async function publishConversationUpdate(
  tenantId: string,
  conversation: unknown,
): Promise<void> {
  await publishSocketEvent({
    type: 'conversation:update',
    tenantId,
    data: conversation,
  });
}

export async function publishNotification(
  tenantId: string,
  userId: string,
  notification: unknown,
): Promise<void> {
  await publishSocketEvent({
    type: 'notification',
    tenantId,
    userId,
    data: notification,
  });
}
