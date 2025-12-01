import { and, db, eq, schema } from '@v4-connect/database';
import { type Job, Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

const eventRedis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';
const META_GRAPH_API_URL = 'https://graph.facebook.com/v18.0';

interface EvolutionMessageSent {
  key?: {
    id?: string;
  };
}

interface MetaSendResult {
  recipient_id?: string;
  message_id?: string;
}

async function evolutionRequest<T>(
  endpoint: string,
  body: unknown,
): Promise<{
  success: boolean;
  data?: T;
  error?: string;
}> {
  try {
    const response = await fetch(`${EVOLUTION_API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: EVOLUTION_API_KEY,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      return { success: false, error: text || `HTTP ${response.status}` };
    }

    const data = (await response.json()) as T;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function metaRequest<T>(
  endpoint: string,
  accessToken: string,
  body: unknown,
): Promise<{
  success: boolean;
  data?: T;
  error?: string;
}> {
  try {
    const response = await fetch(`${META_GRAPH_API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });

    const data = (await response.json()) as { error?: { message: string } } & T;

    if ('error' in data && data.error) {
      return { success: false, error: data.error.message };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

type ChannelType = 'whatsapp_official' | 'whatsapp_unofficial' | 'instagram' | 'messenger';

interface SendMessageJob {
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

interface ProcessIncomingJob {
  channelId: string;
  channelType: string;
  rawPayload: unknown;
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

async function publishSocketEvent(event: {
  type: 'message:update';
  tenantId: string;
  conversationId: string;
  data: unknown;
}) {
  try {
    await eventRedis.publish('socket:events', JSON.stringify(event));
  } catch (error) {
    console.error('[Worker] Failed to publish socket event', error);
  }
}

async function sendMessage(data: SendMessageJob) {
  const { channels, conversations, contacts, messages } = schema;

  const [channel, conversation] = await Promise.all([
    db.query.channels.findFirst({
      where: and(eq(channels.id, data.channelId), eq(channels.tenantId, data.tenantId)),
    }),
    db.query.conversations.findFirst({
      where: and(
        eq(conversations.id, data.conversationId),
        eq(conversations.tenantId, data.tenantId),
      ),
    }),
  ]);

  if (!channel || !conversation) {
    console.error('[Worker] Channel or conversation not found for job', data);
    return { success: false };
  }

  const contact =
    (await db.query.contacts.findFirst({
      where: and(eq(contacts.id, conversation.contactId), eq(contacts.tenantId, data.tenantId)),
    })) || null;

  const phone = data.recipientPhone || contact?.phone;
  const recipientExternalId = data.recipientExternalId || contact?.externalId;

  let status: 'sent' | 'failed' = 'sent';
  let externalId: string | undefined;
  let errorMessage: string | undefined;

  try {
    switch (data.channelType) {
      case 'whatsapp_unofficial': {
        const config = channel.config as { instanceName?: string };
        if (!config?.instanceName || !phone) {
          status = 'failed';
          errorMessage = 'Missing Evolution instanceName or phone';
          break;
        }

        let result: { success: boolean; data?: EvolutionMessageSent; error?: string } | undefined;
        if (data.message.type === 'text' && data.message.content) {
          result = await evolutionRequest<EvolutionMessageSent>(
            `/message/sendText/${config.instanceName}`,
            {
              number: phone,
              text: data.message.content,
            },
          );
        } else if (data.message.type === 'image' && data.message.mediaUrl) {
          result = await evolutionRequest<EvolutionMessageSent>(
            `/message/sendMedia/${config.instanceName}`,
            {
              number: phone,
              mediatype: 'image',
              mimetype: 'image/jpeg',
              media: data.message.mediaUrl,
              caption: data.message.content,
            },
          );
        } else if (data.message.type === 'audio' && data.message.mediaUrl) {
          result = await evolutionRequest<EvolutionMessageSent>(
            `/message/sendMedia/${config.instanceName}`,
            {
              number: phone,
              mediatype: 'audio',
              mimetype: 'audio/ogg',
              media: data.message.mediaUrl,
            },
          );
        } else if (data.message.type === 'document' && data.message.mediaUrl) {
          result = await evolutionRequest<EvolutionMessageSent>(
            `/message/sendMedia/${config.instanceName}`,
            {
              number: phone,
              mediatype: 'document',
              mimetype: data.message.mediaMimeType || 'application/octet-stream',
              media: data.message.mediaUrl,
              fileName: data.message.content || 'document',
            },
          );
        } else if (data.message.type === 'video' && data.message.mediaUrl) {
          result = await evolutionRequest<EvolutionMessageSent>(
            `/message/sendMedia/${config.instanceName}`,
            {
              number: phone,
              mediatype: 'video',
              mimetype: data.message.mediaMimeType || 'video/mp4',
              media: data.message.mediaUrl,
              caption: data.message.content,
            },
          );
        }

        if (!result?.success) {
          status = 'failed';
          errorMessage = result?.error || 'Evolution send failed';
        } else {
          externalId = result.data?.key?.id;
        }
        break;
      }

      case 'instagram':
      case 'messenger': {
        const config = channel.config as { pageAccessToken?: string; igUserId?: string };
        const accessToken = config?.pageAccessToken;

        if (!accessToken || !recipientExternalId) {
          status = 'failed';
          errorMessage = 'Missing pageAccessToken or recipientId';
          break;
        }

        let result: { success: boolean; data?: MetaSendResult; error?: string } | undefined;

        if (data.channelType === 'instagram') {
          if (!config?.igUserId) {
            status = 'failed';
            errorMessage = 'Missing igUserId';
            break;
          }

          if (data.message.type === 'text' && data.message.content) {
            result = await metaRequest<MetaSendResult>(
              `/${config.igUserId}/messages`,
              accessToken,
              {
                recipient: { id: recipientExternalId },
                message: { text: data.message.content },
              },
            );
          } else if (data.message.mediaUrl) {
            const mediaType =
              data.message.type === 'video'
                ? 'video'
                : data.message.type === 'audio'
                  ? 'audio'
                  : 'image';
            result = await metaRequest<MetaSendResult>(
              `/${config.igUserId}/messages`,
              accessToken,
              {
                recipient: { id: recipientExternalId },
                message: {
                  attachment: {
                    type: mediaType,
                    payload: { url: data.message.mediaUrl },
                  },
                },
              },
            );
          }
        } else {
          if (data.message.type === 'text' && data.message.content) {
            result = await metaRequest<MetaSendResult>('/me/messages', accessToken, {
              recipient: { id: recipientExternalId },
              message: { text: data.message.content },
              messaging_type: 'RESPONSE',
            });
          } else if (data.message.mediaUrl) {
            const mediaType =
              data.message.type === 'audio'
                ? 'audio'
                : data.message.type === 'video'
                  ? 'video'
                  : data.message.type === 'document'
                    ? 'file'
                    : 'image';
            result = await metaRequest<MetaSendResult>('/me/messages', accessToken, {
              recipient: { id: recipientExternalId },
              message: {
                attachment: {
                  type: mediaType,
                  payload: { url: data.message.mediaUrl, is_reusable: true },
                },
              },
              messaging_type: 'RESPONSE',
            });
          }
        }

        if (!result?.success) {
          status = 'failed';
          errorMessage = result?.error || 'Meta send failed';
        } else {
          externalId = result.data?.message_id;
        }
        break;
      }

      case 'whatsapp_official':
        status = 'failed';
        errorMessage = 'WhatsApp official provider not yet implemented';
        break;
    }
  } catch (error) {
    status = 'failed';
    errorMessage = error instanceof Error ? error.message : 'Unknown error';
  }

  await db
    .update(messages)
    .set({
      status,
      externalId,
      errorMessage,
      updatedAt: new Date(),
    })
    .where(and(eq(messages.id, data.messageId), eq(messages.tenantId, data.tenantId)));

  await publishSocketEvent({
    type: 'message:update',
    tenantId: data.tenantId,
    conversationId: data.conversationId,
    data: {
      id: data.messageId,
      status,
      externalId,
      errorMessage,
    },
  });

  return { success: status === 'sent', status, externalId, errorMessage };
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
