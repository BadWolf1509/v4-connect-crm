import { Queue } from 'bullmq';
import { Redis } from 'ioredis';

type ChannelType = 'whatsapp_unofficial' | 'whatsapp_official' | 'instagram' | 'messenger';

export interface SendMessageJob {
  tenantId: string;
  conversationId: string;
  channelId: string;
  channelType: ChannelType;
  messageId: string;
  message: {
    type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'template';
    content?: string;
    mediaUrl?: string;
    mediaMimeType?: string;
    templateId?: string;
    templateParams?: Record<string, string>;
  };
  recipientPhone?: string;
  recipientExternalId?: string;
  senderId?: string;
}

export interface CampaignStartJob {
  campaignId: string;
  tenantId: string;
  type: 'broadcast' | 'drip' | 'trigger';
}

export interface TranscriptionJob {
  tenantId: string;
  messageId: string;
  audioUrl: string;
  language?: string;
}

export interface SuggestionJob {
  tenantId: string;
  conversationId: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

export interface SentimentJob {
  tenantId: string;
  messageId: string;
  content: string;
}

export interface ChatbotJob {
  tenantId: string;
  chatbotId: string;
  conversationId: string;
  message: string;
  context: Record<string, unknown>;
}

type AIJob = TranscriptionJob | SuggestionJob | SentimentJob | ChatbotJob;

const redisUrl = process.env.REDIS_URL;
const shouldUseRedis = redisUrl && process.env.NODE_ENV !== 'test';
const connection = shouldUseRedis
  ? new Redis(redisUrl as string, {
      maxRetriesPerRequest: null,
    })
  : null;

export const messageQueue = connection
  ? new Queue<SendMessageJob>('messages', {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: 200,
        removeOnFail: 1000,
      },
    })
  : null;

export const campaignQueue = connection
  ? new Queue<CampaignStartJob>('campaigns', {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: 200,
        removeOnFail: 500,
      },
    })
  : null;

export function addSendMessageJob(data: SendMessageJob) {
  if (!messageQueue) {
    // In test or dev without Redis, simply no-op to keep flow synchronous
    return Promise.resolve(null);
  }
  return messageQueue.add('send', data);
}

export function addCampaignStartJob(data: CampaignStartJob, scheduledAt?: Date) {
  if (!campaignQueue) {
    return Promise.resolve(null);
  }

  const delay = scheduledAt ? Math.max(0, scheduledAt.getTime() - Date.now()) : 0;

  return campaignQueue.add(
    'start',
    data,
    delay
      ? {
          delay,
        }
      : undefined,
  );
}

export const aiQueue = connection
  ? new Queue<AIJob>('ai', {
      connection,
      defaultJobOptions: {
        attempts: 2,
        backoff: {
          type: 'fixed',
          delay: 5000,
        },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    })
  : null;

export const addTranscriptionJob = (data: TranscriptionJob) => {
  if (!aiQueue) return Promise.resolve(null);
  return aiQueue.add('transcribe', data);
};

export const addSuggestionJob = (data: SuggestionJob) => {
  if (!aiQueue) return Promise.resolve(null);
  return aiQueue.add('suggest', data, { priority: 2 });
};

export const addSentimentJob = (data: SentimentJob) => {
  if (!aiQueue) return Promise.resolve(null);
  return aiQueue.add('sentiment', data, { priority: 3 });
};

export const addChatbotJob = (data: ChatbotJob) => {
  if (!aiQueue) return Promise.resolve(null);
  return aiQueue.add('chatbot', data, { priority: 1 });
};
