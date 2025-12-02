import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { addCampaignStartJob } from '../lib/queues';
import { type AppType, requireAuth } from '../middleware/auth';
import { campaignsService } from '../services/campaigns.service';
import { channelsService } from '../services/channels.service';

type CampaignStatus = 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'cancelled';

const allowedStatuses: CampaignStatus[] = [
  'draft',
  'scheduled',
  'running',
  'paused',
  'completed',
  'cancelled',
];

const campaignsRoutes = new Hono<AppType>();

campaignsRoutes.use('*', requireAuth);

const createCampaignSchema = z.object({
  name: z.string().min(2),
  channelId: z.string().uuid(),
  content: z.string().optional(),
  templateId: z.string().optional(),
  scheduledAt: z.string().datetime().optional(),
  contactIds: z.array(z.string().uuid()).default([]),
});

const scheduleSchema = z.object({
  scheduledAt: z.string().datetime().optional(),
});

// List campaigns
campaignsRoutes.get('/', async (c) => {
  const auth = c.get('auth');
  const { status, page = '1', limit = '20' } = c.req.query();

  const statusFilter =
    typeof status === 'string' && allowedStatuses.includes(status as CampaignStatus)
      ? (status as CampaignStatus)
      : undefined;

  const campaigns = await campaignsService.findAll({
    tenantId: auth.tenantId,
    status: statusFilter,
    page: Number.parseInt(page),
    limit: Number.parseInt(limit),
  });

  return c.json(campaigns);
});

// Get campaign by ID
campaignsRoutes.get('/:id', async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');

  const campaign = await campaignsService.findById(id, auth.tenantId);

  if (!campaign) {
    throw new HTTPException(404, { message: 'Campaign not found' });
  }

  return c.json(campaign);
});

// Create campaign
campaignsRoutes.post('/', zValidator('json', createCampaignSchema), async (c) => {
  const auth = c.get('auth');
  const data = c.req.valid('json');

  const channel = await channelsService.findById(data.channelId, auth.tenantId);
  if (!channel) {
    throw new HTTPException(404, { message: 'Channel not found' });
  }

  const campaign = await campaignsService.create({
    tenantId: auth.tenantId,
    channelId: data.channelId,
    name: data.name,
    content: data.content,
    templateId: data.templateId,
    scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
    contactIds: data.contactIds || [],
  });

  if (!campaign) {
    throw new HTTPException(500, { message: 'Failed to create campaign' });
  }

  // Auto-schedule if scheduledAt provided
  if (data.scheduledAt) {
    await addCampaignStartJob(
      {
        campaignId: campaign.id,
        tenantId: auth.tenantId,
        type: 'broadcast',
      },
      new Date(data.scheduledAt),
    );
  }

  return c.json(campaign, 201);
});

// Schedule or start campaign
campaignsRoutes.post('/:id/schedule', zValidator('json', scheduleSchema), async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');
  const data = c.req.valid('json');

  const scheduleFor = data.scheduledAt ? new Date(data.scheduledAt) : new Date();

  const campaign = await campaignsService.schedule(id, auth.tenantId, scheduleFor);

  if (!campaign) {
    throw new HTTPException(404, { message: 'Campaign not found' });
  }

  await addCampaignStartJob(
    {
      campaignId: id,
      tenantId: auth.tenantId,
      type: 'broadcast',
    },
    scheduleFor,
  );

  return c.json({
    campaign,
    scheduledAt: scheduleFor.toISOString(),
  });
});

// Pause running campaign
campaignsRoutes.post('/:id/pause', async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');

  const campaign = await campaignsService.findById(id, auth.tenantId);

  if (!campaign) {
    throw new HTTPException(404, { message: 'Campaign not found' });
  }

  if (campaign.status !== 'running') {
    throw new HTTPException(400, { message: 'Only running campaigns can be paused' });
  }

  const updated = await campaignsService.updateStatus(id, auth.tenantId, 'paused');

  return c.json({ campaign: updated, message: 'Campaign paused' });
});

// Resume paused campaign
campaignsRoutes.post('/:id/resume', async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');

  const campaign = await campaignsService.findById(id, auth.tenantId);

  if (!campaign) {
    throw new HTTPException(404, { message: 'Campaign not found' });
  }

  if (campaign.status !== 'paused') {
    throw new HTTPException(400, { message: 'Only paused campaigns can be resumed' });
  }

  // Resume by changing status back to running
  // The worker will continue processing pending contacts
  const updated = await campaignsService.updateStatus(id, auth.tenantId, 'running');

  // Re-queue the campaign to process remaining contacts
  await addCampaignStartJob({
    campaignId: id,
    tenantId: auth.tenantId,
    type: 'broadcast',
  });

  return c.json({ campaign: updated, message: 'Campaign resumed' });
});

// Cancel campaign
campaignsRoutes.post('/:id/cancel', async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');

  const campaign = await campaignsService.findById(id, auth.tenantId);

  if (!campaign) {
    throw new HTTPException(404, { message: 'Campaign not found' });
  }

  if (campaign.status === 'completed' || campaign.status === 'cancelled') {
    throw new HTTPException(400, { message: 'Campaign is already completed or cancelled' });
  }

  const updated = await campaignsService.updateStatus(id, auth.tenantId, 'cancelled');

  return c.json({ campaign: updated, message: 'Campaign cancelled' });
});

// Get campaign stats
campaignsRoutes.get('/:id/stats', async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');

  const stats = await campaignsService.getStats(id, auth.tenantId);

  if (!stats) {
    throw new HTTPException(404, { message: 'Campaign not found' });
  }

  return c.json(stats);
});

export { campaignsRoutes };
