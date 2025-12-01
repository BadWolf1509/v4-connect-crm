import { and, db, eq, schema, sql } from '@v4-connect/database';
import { type Job, Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { messageQueue } from './message-queue';

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
  tenantId: string;
  channelId: string;
  channelType: 'whatsapp_unofficial' | 'whatsapp_official' | 'instagram' | 'messenger';
  contact: {
    id: string;
    phone?: string | null;
    externalId?: string | null;
    name?: string | null;
  };
  content?: string | null;
  templateId?: string | null;
  templateParams?: Record<string, string>;
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
  },
);

async function ensureConversation(tenantId: string, channelId: string, contactId: string) {
  const existing = await db
    .select({
      id: schema.conversations.id,
    })
    .from(schema.conversations)
    .where(
      and(
        eq(schema.conversations.tenantId, tenantId),
        eq(schema.conversations.channelId, channelId),
        eq(schema.conversations.contactId, contactId),
      ),
    )
    .limit(1);

  if (existing[0]) {
    return existing[0].id;
  }

  const now = new Date();
  const [created] = await db
    .insert(schema.conversations)
    .values({
      tenantId,
      channelId,
      contactId,
      status: 'open',
      lastMessageAt: now,
      metadata: { source: 'campaign' },
    })
    .returning({ id: schema.conversations.id });

  if (!created) {
    throw new Error('Failed to create conversation');
  }

  return created.id;
}

async function startCampaign(data: CampaignJob) {
  const { campaignId, tenantId, type } = data;

  console.log(`Starting ${type} campaign ${campaignId}`);

  const [campaign] = await db
    .select({
      id: schema.campaigns.id,
      tenantId: schema.campaigns.tenantId,
      channelId: schema.campaigns.channelId,
      content: schema.campaigns.content,
      templateId: schema.campaigns.templateId,
      stats: schema.campaigns.stats,
      channelType: schema.channels.type,
      provider: schema.channels.provider,
    })
    .from(schema.campaigns)
    .leftJoin(schema.channels, eq(schema.channels.id, schema.campaigns.channelId))
    .where(and(eq(schema.campaigns.id, campaignId), eq(schema.campaigns.tenantId, tenantId)))
    .limit(1);

  if (!campaign) {
    console.warn(`[Campaigns] Campaign ${campaignId} not found`);
    return { queued: 0 };
  }

  const rawRecipients = await db
    .select({
      id: schema.contacts.id,
      phone: schema.contacts.phone,
      externalId: schema.contacts.externalId,
      name: schema.contacts.name,
    })
    .from(schema.campaignContacts)
    .leftJoin(schema.contacts, eq(schema.contacts.id, schema.campaignContacts.contactId))
    .where(eq(schema.campaignContacts.campaignId, campaignId));

  const recipients = rawRecipients.filter(
    (recipient): recipient is (typeof rawRecipients)[number] & { id: string } =>
      Boolean(recipient.id),
  );

  const now = new Date();

  await db
    .update(schema.campaigns)
    .set({
      status: recipients.length === 0 ? 'completed' : 'running',
      startedAt: now,
      stats: {
        ...(campaign.stats as Record<string, number>),
        total: recipients.length,
        sent: 0,
      },
      updatedAt: now,
      completedAt: recipients.length === 0 ? now : null,
    })
    .where(eq(schema.campaigns.id, campaignId));

  if (recipients.length === 0) {
    return { queued: 0 };
  }

  const channelType: SendCampaignMessageJob['channelType'] =
    campaign.channelType === 'whatsapp' && campaign.provider === 'evolution'
      ? 'whatsapp_unofficial'
      : campaign.channelType === 'whatsapp'
        ? 'whatsapp_official'
        : (campaign.channelType as SendCampaignMessageJob['channelType']);

  for (const recipient of recipients) {
    await campaignQueue.add('send-message', {
      campaignId,
      tenantId,
      channelId: campaign.channelId,
      channelType,
      contact: recipient,
      content: campaign.content,
      templateId: campaign.templateId,
    });
  }

  return { queued: recipients.length };
}

async function sendCampaignMessage(data: SendCampaignMessageJob) {
  const {
    campaignId,
    tenantId,
    channelId,
    contact,
    content,
    templateId,
    templateParams,
    channelType,
  } = data;

  const conversationId = await ensureConversation(tenantId, channelId, contact.id);
  const now = new Date();

  const [message] = await db
    .insert(schema.messages)
    .values({
      tenantId,
      conversationId,
      senderType: 'user',
      type: templateId ? 'template' : 'text',
      direction: 'outbound',
      content: templateId ? undefined : content,
      status: 'pending',
      metadata: {
        campaignId,
        templateId,
        templateParams,
      },
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: schema.messages.id });

  if (!message) {
    throw new Error('Failed to create campaign message');
  }

  await db
    .update(schema.conversations)
    .set({
      lastMessageAt: now,
      updatedAt: now,
    })
    .where(eq(schema.conversations.id, conversationId));

  await messageQueue.add('send', {
    tenantId,
    conversationId,
    channelId,
    channelType,
    messageId: message.id,
    message: {
      type: templateId ? 'template' : 'text',
      content: templateId ? undefined : content || '',
      templateId: templateId ?? undefined,
      templateParams,
    },
    recipientPhone: contact.phone || undefined,
    recipientExternalId: contact.externalId || undefined,
  });

  await db
    .update(schema.campaignContacts)
    .set({
      status: 'sent',
      sentAt: now,
    })
    .where(
      and(
        eq(schema.campaignContacts.campaignId, campaignId),
        eq(schema.campaignContacts.contactId, contact.id),
      ),
    );

  const [campaign] = await db
    .select({ stats: schema.campaigns.stats })
    .from(schema.campaigns)
    .where(and(eq(schema.campaigns.id, campaignId), eq(schema.campaigns.tenantId, tenantId)))
    .limit(1);

  const stats = (campaign?.stats as Record<string, number> | undefined) || {};
  const updatedStats = {
    ...stats,
    sent: (stats.sent || 0) + 1,
  };

  await db
    .update(schema.campaigns)
    .set({
      stats: updatedStats,
      updatedAt: now,
    })
    .where(and(eq(schema.campaigns.id, campaignId), eq(schema.campaigns.tenantId, tenantId)));

  const [remaining] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.campaignContacts)
    .where(
      and(
        eq(schema.campaignContacts.campaignId, campaignId),
        eq(schema.campaignContacts.status, 'pending'),
      ),
    );

  if (Number(remaining?.count ?? 0) === 0) {
    await db
      .update(schema.campaigns)
      .set({
        status: 'completed',
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(schema.campaigns.id, campaignId), eq(schema.campaigns.tenantId, tenantId)));
  }

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
