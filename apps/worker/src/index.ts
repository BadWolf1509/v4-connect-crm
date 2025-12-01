// MUST be first import - loads environment variables before other modules
import './env';

import { Redis } from 'ioredis';
import { aiWorker } from './queues/ai-queue';
import { campaignWorker } from './queues/campaign-queue';
import { messageWorker } from './queues/message-queue';
import { webhookWorker } from './queues/webhook-queue';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

console.log('🔧 V4 Connect Worker starting...');

// Graceful shutdown
const shutdown = async () => {
  console.log('Shutting down workers...');

  await Promise.all([
    messageWorker.close(),
    webhookWorker.close(),
    campaignWorker.close(),
    aiWorker.close(),
  ]);

  await redis.quit();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Log worker events
const workers = [
  { name: 'message', worker: messageWorker },
  { name: 'webhook', worker: webhookWorker },
  { name: 'campaign', worker: campaignWorker },
  { name: 'ai', worker: aiWorker },
];

for (const { name, worker } of workers) {
  worker.on('completed', (job) => {
    console.log(`[${name}] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[${name}] Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error(`[${name}] Worker error:`, err);
  });
}

console.log('✅ All workers started successfully');
console.log('📋 Active queues: messages, webhooks, campaigns, ai');
