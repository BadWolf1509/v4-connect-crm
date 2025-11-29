import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { type AppType, requireAuth } from '../middleware/auth';
import { channelsService } from '../services/channels.service';
import { evolutionService } from '../services/evolution.service';

const whatsappRoutes = new Hono<AppType>();

whatsappRoutes.use('*', requireAuth);

const createInstanceSchema = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().optional(),
});

const sendMessageSchema = z.object({
  channelId: z.string().uuid(),
  number: z.string(),
  content: z.string().optional(),
  type: z.enum(['text', 'image', 'audio', 'video', 'document']).default('text'),
  mediaUrl: z.string().url().optional(),
  fileName: z.string().optional(),
});

// Create WhatsApp instance
whatsappRoutes.post('/instances', zValidator('json', createInstanceSchema), async (c) => {
  const auth = c.get('auth');
  const { name, phone } = c.req.valid('json');

  // Generate unique instance name
  const instanceName = `${auth.tenantId}-${name}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');

  // Create instance in Evolution API
  const result = await evolutionService.createInstance(instanceName, {
    number: phone,
    qrcode: true,
  });

  if (!result.success) {
    throw new HTTPException(500, {
      message: `Failed to create WhatsApp instance: ${result.error}`,
    });
  }

  // Configure webhook for this instance
  const apiUrl = process.env.API_URL || 'http://localhost:3002';
  const webhookUrl = `${apiUrl}/webhooks/whatsapp/evolution`;

  await evolutionService.setWebhook(instanceName, {
    enabled: true,
    url: webhookUrl,
    webhookByEvents: false,
    webhookBase64: true,
    events: [
      'messages.upsert',
      'messages.update',
      'connection.update',
      'qrcode.updated',
    ],
  });

  console.log(`Webhook configured for ${instanceName}: ${webhookUrl}`);

  // Create channel in database
  const channel = await channelsService.create({
    tenantId: auth.tenantId,
    type: 'whatsapp',
    provider: 'evolution',
    name,
    phoneNumber: phone,
    config: { instanceName },
  });

  return c.json(
    {
      channel,
      instance: result.data,
    },
    201,
  );
});

// Get QR code for instance connection
whatsappRoutes.get('/instances/:channelId/qrcode', async (c) => {
  const auth = c.get('auth');
  const channelId = c.req.param('channelId');

  // Get channel
  const channel = await channelsService.findById(channelId, auth.tenantId);

  if (!channel) {
    throw new HTTPException(404, { message: 'Channel not found' });
  }

  if (channel.type !== 'whatsapp') {
    throw new HTTPException(400, { message: 'Channel is not WhatsApp' });
  }

  const instanceName = (channel.config as { instanceName: string })?.instanceName;

  if (!instanceName) {
    throw new HTTPException(400, { message: 'Instance not configured' });
  }

  // Get QR code
  const result = await evolutionService.connectInstance(instanceName);

  if (!result.success) {
    throw new HTTPException(500, {
      message: `Failed to get QR code: ${result.error}`,
    });
  }

  return c.json(result.data);
});

// Get instance connection state
whatsappRoutes.get('/instances/:channelId/state', async (c) => {
  const auth = c.get('auth');
  const channelId = c.req.param('channelId');

  const channel = await channelsService.findById(channelId, auth.tenantId);

  if (!channel) {
    throw new HTTPException(404, { message: 'Channel not found' });
  }

  const instanceName = (channel.config as { instanceName: string })?.instanceName;

  if (!instanceName) {
    throw new HTTPException(400, { message: 'Instance not configured' });
  }

  const result = await evolutionService.getInstanceState(instanceName);

  if (!result.success) {
    throw new HTTPException(500, {
      message: `Failed to get instance state: ${result.error}`,
    });
  }

  // Update channel status based on connection state
  const state = result.data?.state;
  const isActive = state === 'open';

  if (channel.isActive !== isActive) {
    if (isActive) {
      await channelsService.connect(channelId, auth.tenantId);
    } else {
      await channelsService.disconnect(channelId, auth.tenantId);
    }
  }

  return c.json({
    state: result.data?.state,
    isActive,
  });
});

// Disconnect instance
whatsappRoutes.post('/instances/:channelId/disconnect', async (c) => {
  const auth = c.get('auth');
  const channelId = c.req.param('channelId');

  const channel = await channelsService.findById(channelId, auth.tenantId);

  if (!channel) {
    throw new HTTPException(404, { message: 'Channel not found' });
  }

  const instanceName = (channel.config as { instanceName: string })?.instanceName;

  if (!instanceName) {
    throw new HTTPException(400, { message: 'Instance not configured' });
  }

  const result = await evolutionService.logoutInstance(instanceName);

  if (!result.success) {
    throw new HTTPException(500, {
      message: `Failed to disconnect: ${result.error}`,
    });
  }

  await channelsService.disconnect(channelId, auth.tenantId);

  return c.json({ disconnected: true });
});

// Delete instance
whatsappRoutes.delete('/instances/:channelId', async (c) => {
  const auth = c.get('auth');
  const channelId = c.req.param('channelId');

  const channel = await channelsService.findById(channelId, auth.tenantId);

  if (!channel) {
    throw new HTTPException(404, { message: 'Channel not found' });
  }

  const instanceName = (channel.config as { instanceName: string })?.instanceName;

  if (instanceName) {
    await evolutionService.deleteInstance(instanceName);
  }

  await channelsService.delete(channelId, auth.tenantId);

  return c.json({ deleted: true });
});

// Send message
whatsappRoutes.post('/send', zValidator('json', sendMessageSchema), async (c) => {
  const auth = c.get('auth');
  const data = c.req.valid('json');

  const channel = await channelsService.findById(data.channelId, auth.tenantId);

  if (!channel) {
    throw new HTTPException(404, { message: 'Channel not found' });
  }

  if (channel.type !== 'whatsapp') {
    throw new HTTPException(400, { message: 'Channel is not WhatsApp' });
  }

  const instanceName = (channel.config as { instanceName: string })?.instanceName;

  if (!instanceName) {
    throw new HTTPException(400, { message: 'Instance not configured' });
  }

  let result: { success: boolean; data?: unknown; error?: string } | undefined;

  switch (data.type) {
    case 'text':
      if (!data.content) {
        throw new HTTPException(400, { message: 'Content is required for text messages' });
      }
      result = await evolutionService.sendText(instanceName, {
        number: data.number,
        text: data.content,
      });
      break;

    case 'image':
      if (!data.mediaUrl) {
        throw new HTTPException(400, { message: 'Media URL is required for image messages' });
      }
      result = await evolutionService.sendImage(instanceName, {
        number: data.number,
        image: data.mediaUrl,
        caption: data.content,
      });
      break;

    case 'audio':
      if (!data.mediaUrl) {
        throw new HTTPException(400, { message: 'Media URL is required for audio messages' });
      }
      result = await evolutionService.sendAudio(instanceName, {
        number: data.number,
        audio: data.mediaUrl,
      });
      break;

    case 'document':
      if (!data.mediaUrl || !data.fileName) {
        throw new HTTPException(400, {
          message: 'Media URL and file name are required for document messages',
        });
      }
      result = await evolutionService.sendDocument(instanceName, {
        number: data.number,
        document: data.mediaUrl,
        fileName: data.fileName,
        mimetype: 'application/octet-stream',
      });
      break;

    default:
      throw new HTTPException(400, { message: `Unsupported message type: ${data.type}` });
  }

  if (!result.success) {
    throw new HTTPException(500, {
      message: `Failed to send message: ${result.error}`,
    });
  }

  return c.json(result.data, 201);
});

// Check if numbers are on WhatsApp
whatsappRoutes.post('/check-numbers', async (c) => {
  const auth = c.get('auth');
  const { channelId, numbers } = await c.req.json();

  if (!channelId || !numbers || !Array.isArray(numbers)) {
    throw new HTTPException(400, {
      message: 'channelId and numbers array are required',
    });
  }

  const channel = await channelsService.findById(channelId, auth.tenantId);

  if (!channel) {
    throw new HTTPException(404, { message: 'Channel not found' });
  }

  const instanceName = (channel.config as { instanceName: string })?.instanceName;

  if (!instanceName) {
    throw new HTTPException(400, { message: 'Instance not configured' });
  }

  const result = await evolutionService.checkNumber(instanceName, numbers);

  if (!result.success) {
    throw new HTTPException(500, {
      message: `Failed to check numbers: ${result.error}`,
    });
  }

  return c.json(result.data);
});

export { whatsappRoutes };
