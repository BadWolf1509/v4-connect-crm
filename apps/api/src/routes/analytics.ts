import { Hono } from 'hono';
import { type AppType, requireAuth } from '../middleware/auth';
import { analyticsService } from '../services/analytics.service';

const analyticsRoutes = new Hono<AppType>();

analyticsRoutes.use('*', requireAuth);

// Get overview metrics
analyticsRoutes.get('/overview', async (c) => {
  const auth = c.get('auth');
  const overview = await analyticsService.getOverview(auth.tenantId);
  return c.json(overview);
});

// Get conversations by status
analyticsRoutes.get('/conversations/by-status', async (c) => {
  const auth = c.get('auth');
  const data = await analyticsService.getConversationsByStatus(auth.tenantId);
  return c.json({ data });
});

// Get conversations by channel
analyticsRoutes.get('/conversations/by-channel', async (c) => {
  const auth = c.get('auth');
  const data = await analyticsService.getConversationsByChannel(auth.tenantId);
  return c.json({ data });
});

// Get daily conversations (last N days)
analyticsRoutes.get('/conversations/daily', async (c) => {
  const auth = c.get('auth');
  const days = Number.parseInt(c.req.query('days') || '7');
  const data = await analyticsService.getDailyConversations(auth.tenantId, days);
  return c.json({ data });
});

// Get recent conversations
analyticsRoutes.get('/conversations/recent', async (c) => {
  const auth = c.get('auth');
  const limit = Number.parseInt(c.req.query('limit') || '5');
  const data = await analyticsService.getRecentConversations(auth.tenantId, limit);
  return c.json({ data });
});

// Get response time metrics
analyticsRoutes.get('/response-time', async (c) => {
  const auth = c.get('auth');
  const days = Number.parseInt(c.req.query('days') || '30');
  const data = await analyticsService.getResponseTimeMetrics(auth.tenantId, days);
  return c.json(data);
});

// Get response time by agent
analyticsRoutes.get('/response-time/by-agent', async (c) => {
  const auth = c.get('auth');
  const days = Number.parseInt(c.req.query('days') || '30');
  const data = await analyticsService.getResponseTimeByAgent(auth.tenantId, days);
  return c.json({ data });
});

// Get daily response time trend
analyticsRoutes.get('/response-time/daily', async (c) => {
  const auth = c.get('auth');
  const days = Number.parseInt(c.req.query('days') || '7');
  const data = await analyticsService.getDailyResponseTime(auth.tenantId, days);
  return c.json({ data });
});

export { analyticsRoutes };
