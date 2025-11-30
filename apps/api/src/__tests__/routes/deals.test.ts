import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the deals service
const mockDealsService = {
  findAll: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  moveToStage: vi.fn(),
  markAsWon: vi.fn(),
  markAsLost: vi.fn(),
  reopen: vi.fn(),
  getActivities: vi.fn(),
  createActivity: vi.fn(),
  completeActivity: vi.fn(),
  deleteActivity: vi.fn(),
};

vi.mock('../../services/deals.service', () => ({
  dealsService: mockDealsService,
}));

// Import after mocking
const { dealsRoutes } = await import('../../routes/deals');

// Create a valid test token
const createAuthToken = () => {
  const session = {
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      role: 'admin',
      tenantId: 'test-tenant-id',
    },
    expires: new Date(Date.now() + 3600000).toISOString(),
  };
  return Buffer.from(JSON.stringify(session)).toString('base64');
};

const authHeaders = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${createAuthToken()}`,
};

const validPipelineId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const validStageId = 'b1ffcd00-0d1c-5ef9-cc7e-7cc0ce491b22';
const validContactId = 'c2aade11-1e2d-6ef0-dd8f-8dd1df602c33';
const validAssigneeId = 'd3aaef22-2f3e-7ef1-ee9a-9ee2ea713d44';

const createMockDeal = (overrides = {}) => ({
  id: 'deal-123',
  tenantId: 'test-tenant-id',
  pipelineId: validPipelineId,
  stageId: validStageId,
  contactId: validContactId,
  assigneeId: validAssigneeId,
  title: 'Big Sale',
  value: '10000',
  currency: 'BRL',
  status: 'open',
  order: 0,
  expectedCloseDate: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const createMockActivity = (overrides = {}) => ({
  id: 'activity-123',
  dealId: 'deal-123',
  userId: 'test-user-id',
  type: 'call',
  title: 'Follow-up call',
  description: 'Discuss proposal',
  isCompleted: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe('Deals Routes', () => {
  let app: Hono;

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono();
    app.route('/deals', dealsRoutes);
  });

  describe('GET /deals', () => {
    it('should return paginated list of deals', async () => {
      const mockDeals = [createMockDeal(), createMockDeal({ id: 'deal-456' })];
      mockDealsService.findAll.mockResolvedValue({
        deals: mockDeals,
        pagination: { page: 1, limit: 50, total: 2, totalPages: 1 },
      });

      const res = await app.request('/deals', {
        method: 'GET',
        headers: authHeaders,
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.deals).toHaveLength(2);
    });

    it('should filter by pipelineId', async () => {
      mockDealsService.findAll.mockResolvedValue({
        deals: [],
        pagination: { page: 1, limit: 50, total: 0, totalPages: 0 },
      });

      const res = await app.request(`/deals?pipelineId=${validPipelineId}`, {
        method: 'GET',
        headers: authHeaders,
      });

      expect(res.status).toBe(200);
      expect(mockDealsService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ pipelineId: validPipelineId }),
      );
    });

    it('should filter by status', async () => {
      mockDealsService.findAll.mockResolvedValue({
        deals: [createMockDeal({ status: 'won' })],
        pagination: { page: 1, limit: 50, total: 1, totalPages: 1 },
      });

      const res = await app.request('/deals?status=won', {
        method: 'GET',
        headers: authHeaders,
      });

      expect(res.status).toBe(200);
      expect(mockDealsService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'won' }),
      );
    });
  });

  describe('GET /deals/:id', () => {
    it('should return a deal by id', async () => {
      mockDealsService.findById.mockResolvedValue(createMockDeal());

      const res = await app.request('/deals/deal-123', {
        method: 'GET',
        headers: authHeaders,
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.id).toBe('deal-123');
    });

    it('should return 404 if deal not found', async () => {
      mockDealsService.findById.mockResolvedValue(null);

      const res = await app.request('/deals/nonexistent', {
        method: 'GET',
        headers: authHeaders,
      });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /deals', () => {
    it('should create a new deal', async () => {
      mockDealsService.create.mockResolvedValue(createMockDeal());

      const res = await app.request('/deals', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          title: 'Big Sale',
          value: '10000',
          pipelineId: validPipelineId,
          stageId: validStageId,
          contactId: validContactId,
        }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.title).toBe('Big Sale');
    });

    it('should validate title minimum length', async () => {
      const res = await app.request('/deals', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          title: 'X',
          pipelineId: validPipelineId,
          stageId: validStageId,
          contactId: validContactId,
        }),
      });

      expect(res.status).toBe(400);
    });

    it('should validate UUIDs', async () => {
      const res = await app.request('/deals', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          title: 'Big Sale',
          pipelineId: 'not-a-uuid',
          stageId: validStageId,
          contactId: validContactId,
        }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /deals/:id', () => {
    it('should update a deal', async () => {
      mockDealsService.update.mockResolvedValue(createMockDeal({ title: 'Updated Deal' }));

      const res = await app.request('/deals/deal-123', {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ title: 'Updated Deal' }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.title).toBe('Updated Deal');
    });

    it('should return 404 if deal not found', async () => {
      mockDealsService.update.mockResolvedValue(null);

      const res = await app.request('/deals/nonexistent', {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ title: 'New Title' }),
      });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /deals/:id/move', () => {
    it('should move deal to another stage', async () => {
      mockDealsService.moveToStage.mockResolvedValue(createMockDeal({ stageId: validStageId }));

      const res = await app.request('/deals/deal-123/move', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ stageId: validStageId, order: 0 }),
      });

      expect(res.status).toBe(200);
      expect(mockDealsService.moveToStage).toHaveBeenCalledWith(
        'deal-123',
        'test-tenant-id',
        validStageId,
        0,
      );
    });

    it('should return 404 if deal not found', async () => {
      mockDealsService.moveToStage.mockResolvedValue(null);

      const res = await app.request('/deals/nonexistent/move', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ stageId: validStageId }),
      });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /deals/:id/won', () => {
    it('should mark deal as won', async () => {
      mockDealsService.markAsWon.mockResolvedValue(createMockDeal({ status: 'won' }));

      const res = await app.request('/deals/deal-123/won', {
        method: 'POST',
        headers: authHeaders,
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe('won');
    });

    it('should return 404 if deal not found', async () => {
      mockDealsService.markAsWon.mockResolvedValue(null);

      const res = await app.request('/deals/nonexistent/won', {
        method: 'POST',
        headers: authHeaders,
      });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /deals/:id/lost', () => {
    it('should mark deal as lost', async () => {
      mockDealsService.markAsLost.mockResolvedValue(
        createMockDeal({ status: 'lost', lostReason: 'Price too high' }),
      );

      const res = await app.request('/deals/deal-123/lost', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ reason: 'Price too high' }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe('lost');
    });

    it('should return 404 if deal not found', async () => {
      mockDealsService.markAsLost.mockResolvedValue(null);

      const res = await app.request('/deals/nonexistent/lost', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /deals/:id/reopen', () => {
    it('should reopen deal', async () => {
      mockDealsService.reopen.mockResolvedValue(createMockDeal({ status: 'open' }));

      const res = await app.request('/deals/deal-123/reopen', {
        method: 'POST',
        headers: authHeaders,
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe('open');
    });

    it('should return 404 if deal not found', async () => {
      mockDealsService.reopen.mockResolvedValue(null);

      const res = await app.request('/deals/nonexistent/reopen', {
        method: 'POST',
        headers: authHeaders,
      });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /deals/:id', () => {
    it('should delete a deal', async () => {
      mockDealsService.delete.mockResolvedValue(createMockDeal());

      const res = await app.request('/deals/deal-123', {
        method: 'DELETE',
        headers: authHeaders,
      });

      expect(res.status).toBe(200);
      expect(mockDealsService.delete).toHaveBeenCalledWith('deal-123', 'test-tenant-id');
    });

    it('should return 404 if deal not found', async () => {
      mockDealsService.delete.mockResolvedValue(null);

      const res = await app.request('/deals/nonexistent', {
        method: 'DELETE',
        headers: authHeaders,
      });

      expect(res.status).toBe(404);
    });
  });

  describe('GET /deals/:id/activities', () => {
    it('should return deal activities', async () => {
      mockDealsService.findById.mockResolvedValue(createMockDeal());
      mockDealsService.getActivities.mockResolvedValue([createMockActivity()]);

      const res = await app.request('/deals/deal-123/activities', {
        method: 'GET',
        headers: authHeaders,
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.activities).toHaveLength(1);
    });

    it('should return 404 if deal not found', async () => {
      mockDealsService.findById.mockResolvedValue(null);

      const res = await app.request('/deals/nonexistent/activities', {
        method: 'GET',
        headers: authHeaders,
      });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /deals/:id/activities', () => {
    it('should add activity to deal', async () => {
      mockDealsService.findById.mockResolvedValue(createMockDeal());
      mockDealsService.createActivity.mockResolvedValue(createMockActivity());

      const res = await app.request('/deals/deal-123/activities', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          type: 'call',
          title: 'Follow-up call',
          description: 'Discuss proposal',
        }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.type).toBe('call');
    });

    it('should return 404 if deal not found', async () => {
      mockDealsService.findById.mockResolvedValue(null);

      const res = await app.request('/deals/nonexistent/activities', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          type: 'call',
          title: 'Follow-up',
        }),
      });

      expect(res.status).toBe(404);
    });

    it('should validate activity type', async () => {
      const res = await app.request('/deals/deal-123/activities', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          type: 'invalid',
          title: 'Follow-up',
        }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /deals/:id/activities/:activityId/complete', () => {
    it('should complete activity', async () => {
      mockDealsService.findById.mockResolvedValue(createMockDeal());
      mockDealsService.completeActivity.mockResolvedValue(
        createMockActivity({ isCompleted: true }),
      );

      const res = await app.request('/deals/deal-123/activities/activity-123/complete', {
        method: 'POST',
        headers: authHeaders,
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.isCompleted).toBe(true);
    });

    it('should return 404 if deal not found', async () => {
      mockDealsService.findById.mockResolvedValue(null);

      const res = await app.request('/deals/nonexistent/activities/activity-123/complete', {
        method: 'POST',
        headers: authHeaders,
      });

      expect(res.status).toBe(404);
    });

    it('should return 404 if activity not found', async () => {
      mockDealsService.findById.mockResolvedValue(createMockDeal());
      mockDealsService.completeActivity.mockResolvedValue(null);

      const res = await app.request('/deals/deal-123/activities/nonexistent/complete', {
        method: 'POST',
        headers: authHeaders,
      });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /deals/:id/activities/:activityId', () => {
    it('should delete activity', async () => {
      mockDealsService.findById.mockResolvedValue(createMockDeal());
      mockDealsService.deleteActivity.mockResolvedValue(createMockActivity());

      const res = await app.request('/deals/deal-123/activities/activity-123', {
        method: 'DELETE',
        headers: authHeaders,
      });

      expect(res.status).toBe(200);
    });

    it('should return 404 if deal not found', async () => {
      mockDealsService.findById.mockResolvedValue(null);

      const res = await app.request('/deals/nonexistent/activities/activity-123', {
        method: 'DELETE',
        headers: authHeaders,
      });

      expect(res.status).toBe(404);
    });

    it('should return 404 if activity not found', async () => {
      mockDealsService.findById.mockResolvedValue(createMockDeal());
      mockDealsService.deleteActivity.mockResolvedValue(null);

      const res = await app.request('/deals/deal-123/activities/nonexistent', {
        method: 'DELETE',
        headers: authHeaders,
      });

      expect(res.status).toBe(404);
    });
  });
});
