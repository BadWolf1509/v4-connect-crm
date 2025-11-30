import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the pipelines service
const mockPipelinesService = {
  findAll: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  reorderStages: vi.fn(),
  createStage: vi.fn(),
  updateStage: vi.fn(),
  deleteStage: vi.fn(),
};

vi.mock('../../services/pipelines.service', () => ({
  pipelinesService: mockPipelinesService,
}));

// Import after mocking
const { pipelinesRoutes } = await import('../../routes/pipelines');

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

const createMockPipeline = (overrides = {}) => ({
  id: 'pipeline-123',
  tenantId: 'test-tenant-id',
  name: 'Sales Pipeline',
  isDefault: true,
  stages: [
    { id: 'stage-1', name: 'Lead', order: 0, color: '#3B82F6' },
    { id: 'stage-2', name: 'Qualified', order: 1, color: '#10B981' },
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const createMockStage = (overrides = {}) => ({
  id: 'stage-123',
  pipelineId: 'pipeline-123',
  name: 'New Stage',
  order: 2,
  color: '#EF4444',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe('Pipelines Routes', () => {
  let app: Hono;

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono();
    app.route('/pipelines', pipelinesRoutes);
  });

  describe('GET /pipelines', () => {
    it('should return list of pipelines', async () => {
      const mockPipelines = [
        createMockPipeline(),
        createMockPipeline({ id: 'pipeline-456', name: 'Support' }),
      ];
      mockPipelinesService.findAll.mockResolvedValue({ pipelines: mockPipelines });

      const res = await app.request('/pipelines', {
        method: 'GET',
        headers: authHeaders,
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.pipelines).toHaveLength(2);
    });
  });

  describe('GET /pipelines/:id', () => {
    it('should return a pipeline by id', async () => {
      mockPipelinesService.findById.mockResolvedValue(createMockPipeline());

      const res = await app.request('/pipelines/pipeline-123', {
        method: 'GET',
        headers: authHeaders,
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.id).toBe('pipeline-123');
      expect(data.name).toBe('Sales Pipeline');
    });

    it('should return 404 if pipeline not found', async () => {
      mockPipelinesService.findById.mockResolvedValue(null);

      const res = await app.request('/pipelines/nonexistent', {
        method: 'GET',
        headers: authHeaders,
      });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /pipelines', () => {
    it('should create a new pipeline', async () => {
      mockPipelinesService.create.mockResolvedValue(createMockPipeline());

      const res = await app.request('/pipelines', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          name: 'Sales Pipeline',
          isDefault: true,
          stages: [
            { name: 'Lead', order: 0 },
            { name: 'Qualified', order: 1 },
          ],
        }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.name).toBe('Sales Pipeline');
    });

    it('should validate name minimum length', async () => {
      const res = await app.request('/pipelines', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ name: 'X' }),
      });

      expect(res.status).toBe(400);
    });

    it('should create pipeline without stages', async () => {
      mockPipelinesService.create.mockResolvedValue(createMockPipeline({ stages: [] }));

      const res = await app.request('/pipelines', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ name: 'New Pipeline' }),
      });

      expect(res.status).toBe(201);
    });
  });

  describe('PATCH /pipelines/:id', () => {
    it('should update a pipeline', async () => {
      mockPipelinesService.update.mockResolvedValue(
        createMockPipeline({ name: 'Updated Pipeline' }),
      );

      const res = await app.request('/pipelines/pipeline-123', {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ name: 'Updated Pipeline' }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.name).toBe('Updated Pipeline');
    });

    it('should return 404 if pipeline not found', async () => {
      mockPipelinesService.update.mockResolvedValue(null);

      const res = await app.request('/pipelines/nonexistent', {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ name: 'New Name' }),
      });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /pipelines/:id', () => {
    it('should delete a pipeline', async () => {
      mockPipelinesService.delete.mockResolvedValue(createMockPipeline());

      const res = await app.request('/pipelines/pipeline-123', {
        method: 'DELETE',
        headers: authHeaders,
      });

      expect(res.status).toBe(200);
      expect(mockPipelinesService.delete).toHaveBeenCalledWith('pipeline-123', 'test-tenant-id');
    });

    it('should return 404 if pipeline not found', async () => {
      mockPipelinesService.delete.mockResolvedValue(null);

      const res = await app.request('/pipelines/nonexistent', {
        method: 'DELETE',
        headers: authHeaders,
      });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /pipelines/:id/stages/reorder', () => {
    it('should reorder stages', async () => {
      mockPipelinesService.findById
        .mockResolvedValueOnce(createMockPipeline())
        .mockResolvedValueOnce(createMockPipeline());
      mockPipelinesService.reorderStages.mockResolvedValue(undefined);

      const res = await app.request('/pipelines/pipeline-123/stages/reorder', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          stageIds: [
            'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
            'b1ffcd00-0d1c-5ef9-cc7e-7cc0ce491b22',
          ],
        }),
      });

      expect(res.status).toBe(200);
      expect(mockPipelinesService.reorderStages).toHaveBeenCalled();
    });

    it('should return 404 if pipeline not found', async () => {
      mockPipelinesService.findById.mockResolvedValue(null);

      const res = await app.request('/pipelines/nonexistent/stages/reorder', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          stageIds: ['a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'],
        }),
      });

      expect(res.status).toBe(404);
    });

    it('should validate stageIds are UUIDs', async () => {
      const res = await app.request('/pipelines/pipeline-123/stages/reorder', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          stageIds: ['not-a-uuid'],
        }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /pipelines/:id/stages', () => {
    it('should add a stage to pipeline', async () => {
      mockPipelinesService.findById.mockResolvedValue(createMockPipeline());
      mockPipelinesService.createStage.mockResolvedValue(createMockStage());

      const res = await app.request('/pipelines/pipeline-123/stages', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          name: 'New Stage',
          order: 2,
          color: '#EF4444',
        }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.name).toBe('New Stage');
    });

    it('should return 404 if pipeline not found', async () => {
      mockPipelinesService.findById.mockResolvedValue(null);

      const res = await app.request('/pipelines/nonexistent/stages', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          name: 'New Stage',
          order: 0,
        }),
      });

      expect(res.status).toBe(404);
    });

    it('should validate stage name', async () => {
      const res = await app.request('/pipelines/pipeline-123/stages', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          name: '',
          order: 0,
        }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /pipelines/:id/stages/:stageId', () => {
    it('should update a stage', async () => {
      mockPipelinesService.findById.mockResolvedValue(createMockPipeline());
      mockPipelinesService.updateStage.mockResolvedValue(
        createMockStage({ name: 'Updated Stage' }),
      );

      const res = await app.request('/pipelines/pipeline-123/stages/stage-123', {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ name: 'Updated Stage' }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.name).toBe('Updated Stage');
    });

    it('should return 404 if pipeline not found', async () => {
      mockPipelinesService.findById.mockResolvedValue(null);

      const res = await app.request('/pipelines/nonexistent/stages/stage-123', {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ name: 'New Name' }),
      });

      expect(res.status).toBe(404);
    });

    it('should return 404 if stage not found', async () => {
      mockPipelinesService.findById.mockResolvedValue(createMockPipeline());
      mockPipelinesService.updateStage.mockResolvedValue(null);

      const res = await app.request('/pipelines/pipeline-123/stages/nonexistent', {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ name: 'New Name' }),
      });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /pipelines/:id/stages/:stageId', () => {
    it('should delete a stage', async () => {
      mockPipelinesService.findById.mockResolvedValue(createMockPipeline());
      mockPipelinesService.deleteStage.mockResolvedValue(createMockStage());

      const res = await app.request('/pipelines/pipeline-123/stages/stage-123', {
        method: 'DELETE',
        headers: authHeaders,
      });

      expect(res.status).toBe(200);
      expect(mockPipelinesService.deleteStage).toHaveBeenCalledWith('stage-123');
    });

    it('should return 404 if pipeline not found', async () => {
      mockPipelinesService.findById.mockResolvedValue(null);

      const res = await app.request('/pipelines/nonexistent/stages/stage-123', {
        method: 'DELETE',
        headers: authHeaders,
      });

      expect(res.status).toBe(404);
    });

    it('should return 404 if stage not found', async () => {
      mockPipelinesService.findById.mockResolvedValue(createMockPipeline());
      mockPipelinesService.deleteStage.mockResolvedValue(null);

      const res = await app.request('/pipelines/pipeline-123/stages/nonexistent', {
        method: 'DELETE',
        headers: authHeaders,
      });

      expect(res.status).toBe(404);
    });
  });
});
