import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

// Load .env from monorepo root (single source of truth)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../../../.env') });
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { secureHeaders } from 'hono/secure-headers';

import { errorHandler } from './middleware/error-handler';
import { analyticsRoutes } from './routes/analytics';
import { authRoutes } from './routes/auth';
import { campaignsRoutes } from './routes/campaigns';
import { channelsRoutes } from './routes/channels';
import { contactsRoutes } from './routes/contacts';
import { conversationsRoutes } from './routes/conversations';
import { dealsRoutes } from './routes/deals';
import { inboxesRoutes } from './routes/inboxes';
import { messagesRoutes } from './routes/messages';
import { metaWebhooksRoutes } from './routes/meta-webhooks';
import { pipelinesRoutes } from './routes/pipelines';
import { quickRepliesRoutes } from './routes/quick-replies';
import { teamsRoutes } from './routes/teams';
import { uploadRoutes } from './routes/upload';
import { webhooksRoutes } from './routes/webhooks';
import { whatsappRoutes } from './routes/whatsapp';

const app = new Hono();

// Global middleware
app.use('*', logger());
app.use('*', prettyJSON());
app.use('*', secureHeaders());
// CORS - allow Vercel and localhost
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'https://v4-connect-crm-web.vercel.app',
  process.env.CORS_ORIGIN,
].filter(Boolean) as string[];

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
api.route('/channels', channelsRoutes);
api.route('/contacts', contactsRoutes);
api.route('/conversations', conversationsRoutes);
api.route('/campaigns', campaignsRoutes);
api.route('/inboxes', inboxesRoutes);
api.route('/messages', messagesRoutes);
api.route('/pipelines', pipelinesRoutes);
api.route('/deals', dealsRoutes);
api.route('/quick-replies', quickRepliesRoutes);
api.route('/teams', teamsRoutes);
api.route('/upload', uploadRoutes);
api.route('/webhooks', webhooksRoutes);
api.route('/whatsapp', whatsappRoutes);

// Mount API under /api/v1
app.route('/api/v1', api);

// Meta webhooks (mounted directly for Meta verification)
app.route('/meta', metaWebhooksRoutes);

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
