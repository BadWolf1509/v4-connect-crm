import { and, db, eq } from '@v4-connect/database';
import { channels, contacts, conversations, messages } from '@v4-connect/database/schema';
import { type Job, Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { nanoid } from 'nanoid';

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

interface WebhookJob {
  type: 'whatsapp_official' | 'whatsapp_unofficial' | 'instagram' | 'messenger';
  payload: unknown;
  signature?: string;
  tenantId?: string;
  channelId?: string;
}

interface ChannelConfig {
  phoneNumberId?: string;
  instanceName?: string;
  pageId?: string;
  igUserId?: string;
  [key: string]: unknown;
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
    const { type, payload, signature, channelId } = job.data;

    console.log(`Processing ${type} webhook`);

    switch (type) {
      case 'whatsapp_official':
        return await processWhatsAppOfficial(payload, signature);
      case 'whatsapp_unofficial':
        return await processEvolutionAPI(payload, channelId);
      case 'instagram':
        return await processInstagram(payload, signature);
      case 'messenger':
        return await processMessenger(payload, signature);
    }
  },
  {
    connection,
    concurrency: 20,
  },
);

// biome-ignore lint/suspicious/noExplicitAny: Webhook payload structure varies
async function processWhatsAppOfficial(payload: any, _signature?: string) {
  const entry = payload.entry?.[0];
  const changes = entry?.changes?.[0];
  const value = changes?.value;
  const phoneNumberId = value?.metadata?.phone_number_id;

  if (!phoneNumberId) {
    return { processed: false, reason: 'No phone_number_id' };
  }

  // Find channel by phone number ID in config
  const allChannels = await db.query.channels.findMany({
    where: eq(channels.type, 'whatsapp'),
  });

  const channel = allChannels.find((c) => {
    const config = c.config as ChannelConfig;
    return config?.phoneNumberId === phoneNumberId;
  });

  if (!channel) {
    console.warn(`Channel not found for phone_number_id: ${phoneNumberId}`);
    return { processed: false, reason: 'Channel not found' };
  }

  if (value?.messages) {
    for (const message of value.messages) {
      await processIncomingMessage({
        tenantId: channel.tenantId,
        channelId: channel.id,
        senderPhone: message.from,
        externalId: message.id,
        type: mapWhatsAppType(message.type),
        content: extractContent(message),
        mediaUrl: extractMediaUrl(message),
        timestamp: Number.parseInt(message.timestamp) * 1000,
      });
    }
  }

  if (value?.statuses) {
    for (const status of value.statuses) {
      await updateMessageStatus(status.id, status.status);
    }
  }

  return { processed: true };
}

// biome-ignore lint/suspicious/noExplicitAny: Webhook payload structure varies
async function processEvolutionAPI(payload: any, channelId?: string) {
  const event = payload.event;
  const instanceName = payload.instance;

  // Find channel by id or instance name in config
  let channel: Awaited<ReturnType<typeof db.query.channels.findFirst>> | undefined;
  if (channelId) {
    channel = await db.query.channels.findFirst({
      where: eq(channels.id, channelId),
    });
  } else if (instanceName) {
    // Find by instance name in config
    const allChannels = await db.query.channels.findMany({
      where: eq(channels.type, 'whatsapp'),
    });
    channel = allChannels.find((c) => {
      const config = c.config as ChannelConfig;
      return config?.instanceName === instanceName;
    });
  }

  if (!channel) {
    console.warn(`Channel not found for instance: ${instanceName}`);
    return { processed: false, reason: 'Channel not found' };
  }

  switch (event) {
    case 'messages.upsert': {
      const messageData = payload.data;
      if (!messageData) break;

      // Evolution can send single message or array
      const msgs = Array.isArray(messageData) ? messageData : [messageData];

      for (const msg of msgs) {
        // Skip messages from us
        if (msg.key?.fromMe) continue;

        const remoteJid = msg.key?.remoteJid;
        if (!remoteJid) continue;

        // Extract phone number from JID
        const phone = remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '');

        await processIncomingMessage({
          tenantId: channel.tenantId,
          channelId: channel.id,
          senderPhone: phone,
          externalId: msg.key?.id,
          type: mapEvolutionType(msg.messageType),
          content: extractEvolutionContent(msg.message),
          mediaUrl:
            msg.message?.imageMessage?.url ||
            msg.message?.videoMessage?.url ||
            msg.message?.audioMessage?.url ||
            msg.message?.documentMessage?.url,
          timestamp: (msg.messageTimestamp || Date.now() / 1000) * 1000,
        });
      }
      break;
    }

    case 'messages.update': {
      const updates = Array.isArray(payload.data) ? payload.data : [payload.data];
      for (const update of updates) {
        if (update.key?.id && update.status) {
          await updateMessageStatus(update.key.id, mapEvolutionStatus(update.status));
        }
      }
      break;
    }

    case 'connection.update':
      console.log('Evolution connection:', payload.data?.state);
      // Update channel isActive status
      if (payload.data?.state === 'open') {
        await db
          .update(channels)
          .set({ isActive: true, connectedAt: new Date(), updatedAt: new Date() })
          .where(eq(channels.id, channel.id));
      } else if (payload.data?.state === 'close') {
        await db
          .update(channels)
          .set({ isActive: false, updatedAt: new Date() })
          .where(eq(channels.id, channel.id));
      }
      break;
  }

  return { processed: true };
}

// biome-ignore lint/suspicious/noExplicitAny: Webhook payload structure varies
async function processInstagram(payload: any, _signature?: string) {
  const entry = payload.entry?.[0];
  const messaging = entry?.messaging;

  if (!messaging || !Array.isArray(messaging)) {
    return { processed: false, reason: 'No messaging data' };
  }

  const recipientId = entry.id; // Page or IG User ID

  // Find channel by IG user ID in config
  const allChannels = await db.query.channels.findMany({
    where: eq(channels.type, 'instagram'),
  });

  const channel = allChannels.find((c) => {
    const config = c.config as ChannelConfig;
    return config?.igUserId === recipientId || config?.pageId === recipientId;
  });

  if (!channel) {
    console.warn(`Instagram channel not found for: ${recipientId}`);
    return { processed: false, reason: 'Channel not found' };
  }

  for (const event of messaging) {
    if (event.message) {
      await processIncomingMessage({
        tenantId: channel.tenantId,
        channelId: channel.id,
        senderExternalId: event.sender.id,
        externalId: event.message.mid,
        type: event.message.attachments
          ? mapAttachmentType(event.message.attachments[0]?.type)
          : 'text',
        content: event.message.text,
        mediaUrl: event.message.attachments?.[0]?.payload?.url,
        timestamp: event.timestamp,
      });
    }

    if (event.read) {
      // Message was read
      console.log('Instagram message read at:', event.read.watermark);
    }
  }

  return { processed: true };
}

// biome-ignore lint/suspicious/noExplicitAny: Webhook payload structure varies
async function processMessenger(payload: any, _signature?: string) {
  const entry = payload.entry?.[0];
  const messaging = entry?.messaging;

  if (!messaging || !Array.isArray(messaging)) {
    return { processed: false, reason: 'No messaging data' };
  }

  const recipientId = entry.id; // Page ID

  // Find channel by page ID in config
  const allChannels = await db.query.channels.findMany({
    where: eq(channels.type, 'messenger'),
  });

  const channel = allChannels.find((c) => {
    const config = c.config as ChannelConfig;
    return config?.pageId === recipientId;
  });

  if (!channel) {
    console.warn(`Messenger channel not found for: ${recipientId}`);
    return { processed: false, reason: 'Channel not found' };
  }

  for (const event of messaging) {
    if (event.message) {
      await processIncomingMessage({
        tenantId: channel.tenantId,
        channelId: channel.id,
        senderExternalId: event.sender.id,
        externalId: event.message.mid,
        type: event.message.attachments
          ? mapAttachmentType(event.message.attachments[0]?.type)
          : 'text',
        content: event.message.text,
        mediaUrl: event.message.attachments?.[0]?.payload?.url,
        timestamp: event.timestamp,
      });
    }

    if (event.delivery) {
      // Message was delivered
      for (const mid of event.delivery.mids || []) {
        await updateMessageStatus(mid, 'delivered');
      }
    }

    if (event.read) {
      // Message was read
      console.log('Messenger message read at:', event.read.watermark);
    }
  }

  return { processed: true };
}

// Helper function to process incoming message
async function processIncomingMessage(data: {
  tenantId: string;
  channelId: string;
  senderPhone?: string;
  senderExternalId?: string;
  externalId?: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'sticker';
  content?: string;
  mediaUrl?: string;
  timestamp: number;
}) {
  try {
    // Find or create contact
    let contact = await db.query.contacts.findFirst({
      where: and(
        eq(contacts.tenantId, data.tenantId),
        data.senderPhone
          ? eq(contacts.phone, data.senderPhone)
          : eq(contacts.externalId, data.senderExternalId || ''),
      ),
    });

    if (!contact) {
      const [newContact] = await db
        .insert(contacts)
        .values({
          id: nanoid(),
          tenantId: data.tenantId,
          name: data.senderPhone || `User ${data.senderExternalId?.slice(-6)}`,
          phone: data.senderPhone,
          externalId: data.senderExternalId,
        })
        .returning();
      contact = newContact;
    }

    if (!contact) {
      throw new Error('Failed to find or create contact');
    }

    // Find or create conversation
    let conversation = await db.query.conversations.findFirst({
      where: and(
        eq(conversations.channelId, data.channelId),
        eq(conversations.contactId, contact.id),
      ),
    });

    if (!conversation) {
      const [newConversation] = await db
        .insert(conversations)
        .values({
          id: nanoid(),
          tenantId: data.tenantId,
          channelId: data.channelId,
          contactId: contact.id,
          status: 'open',
        })
        .returning();
      conversation = newConversation;
    } else if (conversation.status === 'resolved') {
      // Reopen resolved conversation
      await db
        .update(conversations)
        .set({ status: 'open', updatedAt: new Date() })
        .where(eq(conversations.id, conversation.id));
    }

    if (!conversation) {
      throw new Error('Failed to find or create conversation');
    }

    // Create message with proper schema fields
    await db.insert(messages).values({
      id: nanoid(),
      tenantId: data.tenantId,
      conversationId: conversation.id,
      type: data.type,
      content: data.content || null,
      mediaUrl: data.mediaUrl || null,
      senderType: 'contact',
      direction: 'inbound',
      status: 'delivered',
      externalId: data.externalId,
      createdAt: new Date(data.timestamp),
    });

    // Update conversation lastMessageAt
    await db
      .update(conversations)
      .set({
        lastMessageAt: new Date(data.timestamp),
        updatedAt: new Date(),
      })
      .where(eq(conversations.id, conversation.id));

    console.log(`Saved message in conversation ${conversation.id}`);

    // TODO: Emit socket event for real-time update
    // TODO: Check automation triggers
    // TODO: Send push notification
  } catch (error) {
    console.error('Error processing incoming message:', error);
    throw error;
  }
}

// Helper function to update message status
async function updateMessageStatus(externalId: string, status: string) {
  try {
    const mappedStatus = status === 'read' ? 'read' : status === 'delivered' ? 'delivered' : 'sent';

    await db
      .update(messages)
      .set({ status: mappedStatus, updatedAt: new Date() })
      .where(eq(messages.externalId, externalId));

    console.log(`Updated message ${externalId} status to ${mappedStatus}`);
  } catch (error) {
    console.error('Error updating message status:', error);
  }
}

// Helper mappers
function mapWhatsAppType(
  type: string,
): 'text' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'sticker' {
  const typeMap: Record<
    string,
    'text' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'sticker'
  > = {
    text: 'text',
    image: 'image',
    video: 'video',
    audio: 'audio',
    voice: 'audio',
    document: 'document',
    location: 'location',
    sticker: 'sticker',
  };
  return typeMap[type] || 'text';
}

function mapEvolutionType(
  type: string,
): 'text' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'sticker' {
  const typeMap: Record<
    string,
    'text' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'sticker'
  > = {
    conversation: 'text',
    extendedTextMessage: 'text',
    imageMessage: 'image',
    videoMessage: 'video',
    audioMessage: 'audio',
    documentMessage: 'document',
    locationMessage: 'location',
    stickerMessage: 'sticker',
  };
  return typeMap[type] || 'text';
}

function mapEvolutionStatus(status: number): string {
  const statusMap: Record<number, string> = {
    0: 'pending',
    1: 'sent',
    2: 'delivered',
    3: 'read',
    4: 'failed',
  };
  return statusMap[status] || 'sent';
}

function mapAttachmentType(
  type: string,
): 'text' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'sticker' {
  const typeMap: Record<
    string,
    'text' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'sticker'
  > = {
    image: 'image',
    video: 'video',
    audio: 'audio',
    file: 'document',
  };
  return typeMap[type] || 'document';
}

// biome-ignore lint/suspicious/noExplicitAny: Message structure varies
function extractContent(message: any): string {
  if (message.text?.body) return message.text.body;
  if (message.image?.caption) return message.image.caption;
  if (message.video?.caption) return message.video.caption;
  return '';
}

// biome-ignore lint/suspicious/noExplicitAny: Message structure varies
function extractMediaUrl(message: any): string | undefined {
  return (
    message.image?.link || message.video?.link || message.audio?.link || message.document?.link
  );
}

// biome-ignore lint/suspicious/noExplicitAny: Message structure varies
function extractEvolutionContent(message: any): string {
  if (!message) return '';
  if (message.conversation) return message.conversation;
  if (message.extendedTextMessage?.text) return message.extendedTextMessage.text;
  if (message.imageMessage?.caption) return message.imageMessage.caption;
  if (message.videoMessage?.caption) return message.videoMessage.caption;
  return '';
}

export const addWebhookJob = (data: WebhookJob) => {
  return webhookQueue.add('process', data, {
    priority: 1,
  });
};
