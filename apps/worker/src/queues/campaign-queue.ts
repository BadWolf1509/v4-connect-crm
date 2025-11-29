import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

interface CampaignJob {
  campaignId: string;
  tenantId: string;
  type: 'broadcast' | 'drip' | 'trigger';
}

interface SendCampaignMessageJob {
  campaignId: string;
  contactId: string;
  channelId: string;
  templateId: string;
  params: Record<string, string>;
}

export const campaignQueue = new Queue<CampaignJob | SendCampaignMessageJob>('campaigns', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

export const campaignWorker = new Worker<CampaignJob | SendCampaignMessageJob>(
  'campaigns',
  async (job: Job) => {
    const { name, data } = job;

    switch (name) {
      case 'start':
        return await startCampaign(data as CampaignJob);
      case 'send-message':
        return await sendCampaignMessage(data as SendCampaignMessageJob);
      default:
        throw new Error(`Unknown job type: ${name}`);
    }
  },
  {
    connection,
    concurrency: 5,
  }
);

async function startCampaign(data: CampaignJob) {
  const { campaignId, type } = data;

  console.log(`Starting ${type} campaign ${campaignId}`);

  // TODO: Get campaign from database
  // TODO: Get target contacts based on filters
  // TODO: Queue individual messages with rate limiting

  // Example: Queue messages for each contact
  const contacts = []; // TODO: Get from database

  for (const contact of contacts) {
    await campaignQueue.add(
      'send-message',
      {
        campaignId,
        contactId: contact.id,
        channelId: 'channel-id',
        templateId: 'template-id',
        params: {
          name: contact.name,
        },
      },
      {
        delay: Math.random() * 60000, // Random delay up to 1 minute
      }
    );
  }

  // TODO: Update campaign status to 'running'

  return { queued: contacts.length };
}

async function sendCampaignMessage(data: SendCampaignMessageJob) {
  const { campaignId, contactId, templateId, params } = data;

  console.log(`Sending campaign message to ${contactId}`);

  // TODO: Get contact and channel
  // TODO: Send template message via WhatsApp API
  // TODO: Record delivery in database
  // TODO: Update campaign stats

  return { sent: true };
}

// Schedule campaign
export const scheduleCampaign = (data: CampaignJob, scheduledAt: Date) => {
  const delay = scheduledAt.getTime() - Date.now();
  return campaignQueue.add('start', data, { delay: Math.max(0, delay) });
};

// Start campaign immediately
export const startCampaignNow = (data: CampaignJob) => {
  return campaignQueue.add('start', data);
};
