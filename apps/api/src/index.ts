import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { secureHeaders } from 'hono/secure-headers';

import { errorHandler } from './middleware/error-handler';
import { authRoutes } from './routes/auth';
import { channelsRoutes } from './routes/channels';
import { contactsRoutes } from './routes/contacts';
import { conversationsRoutes } from './routes/conversations';
import { dealsRoutes } from './routes/deals';
import { inboxesRoutes } from './routes/inboxes';
import { messagesRoutes } from './routes/messages';
import { pipelinesRoutes } from './routes/pipelines';
import { teamsRoutes } from './routes/teams';
import { webhooksRoutes } from './routes/webhooks';
import { whatsappRoutes } from './routes/whatsapp';

const app = new Hono();

// Global middleware
app.use('*', logger());
app.use('*', prettyJSON());
app.use('*', secureHeaders());
app.use(
  '*',
  cors({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
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

api.route('/auth', authRoutes);
api.route('/channels', channelsRoutes);
api.route('/contacts', contactsRoutes);
api.route('/conversations', conversationsRoutes);
api.route('/inboxes', inboxesRoutes);
api.route('/messages', messagesRoutes);
api.route('/pipelines', pipelinesRoutes);
api.route('/deals', dealsRoutes);
api.route('/teams', teamsRoutes);
api.route('/webhooks', webhooksRoutes);
api.route('/whatsapp', whatsappRoutes);

// Mount API under /api/v1
app.route('/api/v1', api);

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

const port = Number.parseInt(process.env.PORT || '3002', 10);

console.log(`🚀 V4 Connect API running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});

export default app;
