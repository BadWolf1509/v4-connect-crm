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

// Campaign metrics
analyticsRoutes.get('/campaigns', async (c) => {
  const auth = c.get('auth');
  const days = Number.parseInt(c.req.query('days') || '30');
  const data = await analyticsService.getCampaignMetrics(auth.tenantId, { days });
  return c.json(data);
});

// Campaign performance list
analyticsRoutes.get('/campaigns/performance', async (c) => {
  const auth = c.get('auth');
  const days = Number.parseInt(c.req.query('days') || '30');
  const data = await analyticsService.getCampaignPerformance(auth.tenantId, { days });
  return c.json({ data });
});

// Agent performance metrics
analyticsRoutes.get('/agents', async (c) => {
  const auth = c.get('auth');
  const days = Number.parseInt(c.req.query('days') || '30');
  const data = await analyticsService.getAgentPerformance(auth.tenantId, { days });
  return c.json({ data });
});

// Export report
analyticsRoutes.get('/export/:type', async (c) => {
  const auth = c.get('auth');
  const type = c.req.param('type') as 'overview' | 'conversations' | 'agents' | 'campaigns';
  const days = Number.parseInt(c.req.query('days') || '30');
  const format = c.req.query('format') || 'json';

  const data = await analyticsService.exportReport(auth.tenantId, type, { days });

  if (format === 'csv') {
    // Convert to CSV
    if (data.length === 0) {
      return c.text('', 200, {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${type}-report.csv"`,
      });
    }

    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map((row) =>
        headers
          .map((header) => {
            const value = row[header];
            if (value === null || value === undefined) return '';
            if (typeof value === 'object') return JSON.stringify(value).replace(/"/g, '""');
            return String(value).includes(',') ? `"${value}"` : String(value);
          })
          .join(','),
      ),
    ];

    return c.text(csvRows.join('\n'), 200, {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${type}-report.csv"`,
    });
  }

  return c.json({ data, exportedAt: new Date().toISOString() });
});

export { analyticsRoutes };
