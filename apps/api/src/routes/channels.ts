import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { type AppType, requireAuth } from '../middleware/auth';
import { channelsService } from '../services/channels.service';
import { evolutionService } from '../services/evolution.service';

const channelsRoutes = new Hono<AppType>();

channelsRoutes.use('*', requireAuth);

const createChannelSchema = z.object({
  type: z.enum(['whatsapp', 'instagram', 'messenger', 'email']),
  provider: z.enum(['evolution', '360dialog']).optional(),
  name: z.string().min(2),
  phoneNumber: z.string().optional(),
  config: z.record(z.any()).optional(),
});

const updateChannelSchema = z.object({
  name: z.string().min(2).optional(),
  phoneNumber: z.string().optional(),
  config: z.record(z.any()).optional(),
});

// List channels with real-time status from providers
channelsRoutes.get('/', async (c) => {
  const auth = c.get('auth');
  const { type, isActive } = c.req.query();

  const result = await channelsService.findAll({
    tenantId: auth.tenantId,
    type: type as 'whatsapp' | 'instagram' | 'messenger' | 'email' | undefined,
    isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
  });

  const enrichedChannels = await Promise.all(
    result.channels.map(async (channel) => {
      if (channel.type === 'whatsapp' && channel.provider === 'evolution') {
        const instanceName = (channel.config as { instanceName?: string })?.instanceName;

        if (instanceName) {
          try {
            const stateResult = await evolutionService.getInstanceState(instanceName);

            if (stateResult.success && stateResult.data?.instance) {
              const isConnected = stateResult.data.instance.state === 'open';

              // Update database if status changed
              if (isConnected !== channel.isActive) {
                if (isConnected) {
                  await channelsService.connect(channel.id, auth.tenantId);
                } else {
                  await channelsService.disconnect(channel.id, auth.tenantId);
                }
                return {
                  ...channel,
                  isActive: isConnected,
                  connectedAt: isConnected ? new Date() : null,
                };
              }
            }
          } catch (err) {
            console.warn(`Failed to get status for channel ${channel.id}:`, err);
          }
        }
      }
      return channel;
    }),
  );

  return c.json({ data: enrichedChannels });
});

// Get channel by ID
channelsRoutes.get('/:id', async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');

  const channel = await channelsService.findById(id, auth.tenantId);

  if (!channel) {
    throw new HTTPException(404, { message: 'Channel not found' });
  }

  return c.json(channel);
});

// Create channel
channelsRoutes.post('/', zValidator('json', createChannelSchema), async (c) => {
  const auth = c.get('auth');
  const data = c.req.valid('json');

  const channel = await channelsService.create({
    tenantId: auth.tenantId,
    type: data.type,
    provider: data.provider,
    name: data.name,
    phoneNumber: data.phoneNumber,
    config: data.config,
  });

  return c.json(channel, 201);
});

// Update channel
channelsRoutes.patch('/:id', zValidator('json', updateChannelSchema), async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');
  const data = c.req.valid('json');

  const channel = await channelsService.update(id, auth.tenantId, data);

  if (!channel) {
    throw new HTTPException(404, { message: 'Channel not found' });
  }

  return c.json(channel);
});

// Connect channel
channelsRoutes.post('/:id/connect', async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');

  const channel = await channelsService.findById(id, auth.tenantId);

  if (!channel) {
    throw new HTTPException(404, { message: 'Channel not found' });
  }

  // TODO: Initiate connection based on channel type
  // - WhatsApp: Return QR code from Evolution API or OAuth URL from 360dialog
  // - Instagram/Messenger: Return Meta OAuth URL
  // - Email: Validate SMTP settings

  // For now, just mark as connected
  const updatedChannel = await channelsService.connect(id, auth.tenantId);

  return c.json({
    channel: updatedChannel,
    connection: {
      type: 'pending',
      message: 'Connection initiated. Waiting for provider confirmation.',
    },
  });
});

// Disconnect channel
channelsRoutes.post('/:id/disconnect', async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');

  const channel = await channelsService.disconnect(id, auth.tenantId);

  if (!channel) {
    throw new HTTPException(404, { message: 'Channel not found' });
  }

  return c.json(channel);
});

// Delete channel
channelsRoutes.delete('/:id', async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');

  const channel = await channelsService.delete(id, auth.tenantId);

  if (!channel) {
    throw new HTTPException(404, { message: 'Channel not found' });
  }

  return c.json({ message: 'Channel deleted' });
});

export { channelsRoutes };
