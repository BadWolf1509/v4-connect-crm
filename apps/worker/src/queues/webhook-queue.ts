import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

interface WebhookJob {
  type: 'whatsapp_official' | 'whatsapp_unofficial' | 'instagram' | 'messenger';
  payload: any;
  signature?: string;
  tenantId?: string;
}

export const webhookQueue = new Queue<WebhookJob>('webhooks', {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: 1000,
  },
});

export const webhookWorker = new Worker<WebhookJob>(
  'webhooks',
  async (job: Job<WebhookJob>) => {
    const { type, payload, signature } = job.data;

    console.log(`Processing ${type} webhook`);

    switch (type) {
      case 'whatsapp_official':
        return await processWhatsAppOfficial(payload, signature);
      case 'whatsapp_unofficial':
        return await processEvolutionAPI(payload);
      case 'instagram':
        return await processInstagram(payload, signature);
      case 'messenger':
        return await processMessenger(payload, signature);
    }
  },
  {
    connection,
    concurrency: 20,
  }
);

async function processWhatsAppOfficial(payload: any, signature?: string) {
  // TODO: Validate webhook signature
  // const isValid = validateWhatsAppSignature(payload, signature);

  const entry = payload.entry?.[0];
  const changes = entry?.changes?.[0];
  const value = changes?.value;

  if (value?.messages) {
    // Process incoming messages
    for (const message of value.messages) {
      // TODO: Process each message type
      console.log('WhatsApp message:', message.type);
    }
  }

  if (value?.statuses) {
    // Process status updates (sent, delivered, read)
    for (const status of value.statuses) {
      console.log('WhatsApp status:', status.status);
      // TODO: Update message status in database
    }
  }

  return { processed: true };
}

async function processEvolutionAPI(payload: any) {
  const event = payload.event;

  switch (event) {
    case 'messages.upsert':
      // New message
      const messages = payload.data;
      for (const msg of messages) {
        console.log('Evolution message:', msg.messageType);
        // TODO: Process message
      }
      break;

    case 'messages.update':
      // Status update
      const updates = payload.data;
      for (const update of updates) {
        console.log('Evolution status:', update.status);
        // TODO: Update message status
      }
      break;

    case 'connection.update':
      // Connection status changed
      console.log('Evolution connection:', payload.data.state);
      // TODO: Update channel status
      break;

    case 'qrcode.updated':
      // QR code updated
      console.log('Evolution QR updated');
      // TODO: Emit QR code to frontend
      break;
  }

  return { processed: true };
}

async function processInstagram(payload: any, signature?: string) {
  // TODO: Validate signature
  // TODO: Process Instagram DMs

  const entry = payload.entry?.[0];
  const messaging = entry?.messaging?.[0];

  if (messaging?.message) {
    console.log('Instagram message received');
    // TODO: Process message
  }

  return { processed: true };
}

async function processMessenger(payload: any, signature?: string) {
  // TODO: Validate signature
  // TODO: Process Messenger messages

  const entry = payload.entry?.[0];
  const messaging = entry?.messaging?.[0];

  if (messaging?.message) {
    console.log('Messenger message received');
    // TODO: Process message
  }

  return { processed: true };
}

export const addWebhookJob = (data: WebhookJob) => {
  return webhookQueue.add('process', data, {
    priority: 1,
  });
};
