// MUST be first import - loads environment variables before other modules
import './env';

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { secureHeaders } from 'hono/secure-headers';

import { docsRoutes } from './docs/openapi';
import { errorHandler } from './middleware/error-handler';
import { analyticsRoutes } from './routes/analytics';
import { authRoutes } from './routes/auth';
import { automationsRoutes } from './routes/automations';
import { campaignsRoutes } from './routes/campaigns';
import { channelsRoutes } from './routes/channels';
import { chatbotsRoutes } from './routes/chatbots';
import { contactsRoutes } from './routes/contacts';
import { conversationsRoutes } from './routes/conversations';
import { dealsRoutes } from './routes/deals';
import { importRoutes } from './routes/import';
import { inboxesRoutes } from './routes/inboxes';
import { inviteAcceptRoutes } from './routes/invite-accept';
import { invitesRoutes } from './routes/invites';
import { messagesRoutes } from './routes/messages';
import { metaWebhooksRoutes } from './routes/meta-webhooks';
import { notificationsRoutes } from './routes/notifications';
import { pipelinesRoutes } from './routes/pipelines';
import { quickRepliesRoutes } from './routes/quick-replies';
import { tagsRoutes } from './routes/tags';
import { teamsRoutes } from './routes/teams';
import { uploadRoutes } from './routes/upload';
import { usersRoutes } from './routes/users';
import { webhooksRoutes } from './routes/webhooks';
import { whatsappRoutes } from './routes/whatsapp';

const app = new Hono();

// Global middleware
app.use('*', logger());
app.use('*', prettyJSON());
app.use('*', secureHeaders());
// CORS - allow Vercel and localhost
const allowedOrigins = (
  [
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3003',
    'https://v4-connect-crm-web.vercel.app',
    process.env.CORS_ORIGIN,
  ] as const
).filter(Boolean) as string[];

app.use(
  '*',
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);

// Error handling
app.onError(errorHandler);

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
  });
});

// API Routes
const api = new Hono();

api.route('/analytics', analyticsRoutes);
api.route('/auth', authRoutes);
api.route('/automations', automationsRoutes);
api.route('/channels', channelsRoutes);
api.route('/contacts', contactsRoutes);
api.route('/conversations', conversationsRoutes);
api.route('/campaigns', campaignsRoutes);
api.route('/chatbots', chatbotsRoutes);
api.route('/inboxes', inboxesRoutes);
api.route('/invites', invitesRoutes);
api.route('/messages', messagesRoutes);
api.route('/pipelines', pipelinesRoutes);
api.route('/deals', dealsRoutes);
api.route('/import', importRoutes);
api.route('/quick-replies', quickRepliesRoutes);
api.route('/tags', tagsRoutes);
api.route('/teams', teamsRoutes);
api.route('/upload', uploadRoutes);
api.route('/users', usersRoutes);
api.route('/webhooks', webhooksRoutes);
api.route('/notifications', notificationsRoutes);
api.route('/whatsapp', whatsappRoutes);

// Mount API under /api/v1
app.route('/api/v1', api);

// Public invite acceptance routes (no auth required)
app.route('/api/v1/invite', inviteAcceptRoutes);

// Meta webhooks (mounted directly for Meta verification)
app.route('/meta', metaWebhooksRoutes);

// API Documentation (Swagger UI)
app.route('/docs', docsRoutes);

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      error: 'Not Found',
      message: `Route ${c.req.method} ${c.req.path} not found`,
    },
    404,
  );
});

const port = Number.parseInt(process.env.PORT || '3001', 10);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

console.log(`🚀 V4 Connect API running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});

export default app;
