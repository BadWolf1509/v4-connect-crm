import { type Job, Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

interface SendMessageJob {
  conversationId: string;
  channelId: string;
  channelType: 'whatsapp_official' | 'whatsapp_unofficial' | 'instagram' | 'messenger';
  message: {
    type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'template';
    content?: string;
    mediaUrl?: string;
    templateId?: string;
    templateParams?: Record<string, string>;
  };
  recipientPhone?: string;
  recipientId?: string;
}

interface ProcessIncomingJob {
  channelId: string;
  channelType: string;
  rawPayload: any;
}

export const messageQueue = new Queue<SendMessageJob | ProcessIncomingJob>('messages', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: 100,
    removeOnFail: 1000,
  },
});

export const messageWorker = new Worker<SendMessageJob | ProcessIncomingJob>(
  'messages',
  async (job: Job) => {
    const { name, data } = job;

    switch (name) {
      case 'send':
        return await sendMessage(data as SendMessageJob);
      case 'process-incoming':
        return await processIncoming(data as ProcessIncomingJob);
      default:
        throw new Error(`Unknown job type: ${name}`);
    }
  },
  {
    connection,
    concurrency: 10,
  },
);

async function sendMessage(data: SendMessageJob) {
  const { channelType, message, recipientPhone: _recipientPhone, recipientId: _recipientId } = data;

  console.log(`Sending ${message.type} message via ${channelType}`);

  switch (channelType) {
    case 'whatsapp_official':
      // TODO: Send via 360dialog/Meta Cloud API
      // const response = await send360DialogMessage(data);
      break;

    case 'whatsapp_unofficial':
      // TODO: Send via Evolution API
      // const response = await sendEvolutionMessage(data);
      break;

    case 'instagram':
      // TODO: Send via Instagram Graph API
      break;

    case 'messenger':
      // TODO: Send via Messenger Platform
      break;
  }

  // TODO: Update message status in database
  // TODO: Emit socket event for real-time update

  return { success: true };
}

async function processIncoming(data: ProcessIncomingJob) {
  const { channelType, rawPayload: _rawPayload } = data;

  console.log(`Processing incoming ${channelType} message`);

  // TODO: Parse message based on channel type
  // TODO: Find or create contact
  // TODO: Find or create conversation
  // TODO: Save message to database
  // TODO: Run automation triggers
  // TODO: Emit socket event

  return { success: true };
}

// Helper to add jobs
export const addSendMessageJob = (data: SendMessageJob) => {
  return messageQueue.add('send', data);
};

export const addProcessIncomingJob = (data: ProcessIncomingJob) => {
  return messageQueue.add('process-incoming', data, {
    priority: 1, // Higher priority for incoming messages
  });
};
