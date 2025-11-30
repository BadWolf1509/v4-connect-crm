import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock apiClient
const mockApiClient = {
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
};

vi.mock('@/lib/api-client', () => ({
  apiClient: mockApiClient,
}));

// Import hooks after mocking
import {
  useCreateDeal,
  useCreatePipeline,
  useDeal,
  useDeals,
  useMarkDealLost,
  useMarkDealWon,
  useMoveDeal,
  usePipeline,
  usePipelines,
} from '@/hooks/use-pipelines';

// Test wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const mockPipeline = {
  id: 'pipeline-123',
  name: 'Sales Pipeline',
  stages: [
    { id: 'stage-1', name: 'Lead', color: '#3b82f6', order: 0 },
    { id: 'stage-2', name: 'Qualified', color: '#22c55e', order: 1 },
    { id: 'stage-3', name: 'Proposal', color: '#f59e0b', order: 2 },
    { id: 'stage-4', name: 'Closed', color: '#8b5cf6', order: 3 },
  ],
  createdAt: '2024-01-01T00:00:00Z',
};

const mockPipelinesResponse = {
  pipelines: [mockPipeline],
};

const mockDeal = {
  id: 'deal-123',
  title: 'Enterprise Contract',
  pipelineId: 'pipeline-123',
  stageId: 'stage-1',
  value: '50000.00',
  status: 'open' as const,
  contact: {
    id: 'contact-123',
    name: 'John Doe',
    email: 'john@example.com',
  },
  assignee: {
    id: 'user-123',
    name: 'Sales Rep',
    email: 'sales@example.com',
  },
  expectedCloseDate: '2024-03-01',
  createdAt: '2024-01-01T00:00:00Z',
};

const mockDealsResponse = {
  deals: [mockDeal],
  pagination: {
    page: 1,
    limit: 20,
    total: 1,
    totalPages: 1,
  },
};

describe('usePipelines hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('usePipelines', () => {
    it('should fetch all pipelines', async () => {
      mockApiClient.get.mockResolvedValueOnce(mockPipelinesResponse);

      const { result } = renderHook(() => usePipelines(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockApiClient.get).toHaveBeenCalledWith('/pipelines');
      expect(result.current.data).toEqual(mockPipelinesResponse);
    });

    it('should handle error when fetching pipelines fails', async () => {
      mockApiClient.get.mockRejectedValueOnce(new Error('Failed to fetch pipelines'));

      const { result } = renderHook(() => usePipelines(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeInstanceOf(Error);
    });
  });

  describe('usePipeline', () => {
    it('should fetch single pipeline by id', async () => {
      mockApiClient.get.mockResolvedValueOnce(mockPipeline);

      const { result } = renderHook(() => usePipeline('pipeline-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockApiClient.get).toHaveBeenCalledWith('/pipelines/pipeline-123');
      expect(result.current.data).toEqual(mockPipeline);
    });

    it('should not fetch when id is empty', () => {
      const { result } = renderHook(() => usePipeline(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
    });
  });

  describe('useCreatePipeline', () => {
    it('should create pipeline with stages', async () => {
      mockApiClient.post.mockResolvedValueOnce(mockPipeline);

      const { result } = renderHook(() => useCreatePipeline(), {
        wrapper: createWrapper(),
      });

      const newPipeline = {
        name: 'Sales Pipeline',
        stages: [
          { name: 'Lead', color: '#3b82f6', order: 0 },
          { name: 'Qualified', color: '#22c55e', order: 1 },
        ],
      };

      result.current.mutate(newPipeline);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockApiClient.post).toHaveBeenCalledWith('/pipelines', newPipeline);
    });

    it('should create pipeline without stages', async () => {
      mockApiClient.post.mockResolvedValueOnce({ ...mockPipeline, stages: [] });

      const { result } = renderHook(() => useCreatePipeline(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ name: 'Empty Pipeline' });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockApiClient.post).toHaveBeenCalledWith('/pipelines', { name: 'Empty Pipeline' });
    });
  });

  describe('useDeals', () => {
    it('should fetch deals with default filters', async () => {
      mockApiClient.get.mockResolvedValueOnce(mockDealsResponse);

      const { result } = renderHook(() => useDeals(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockApiClient.get).toHaveBeenCalledWith('/deals', {
        params: expect.objectContaining({}),
      });
      expect(result.current.data).toEqual(mockDealsResponse);
    });

    it('should fetch deals with all filters', async () => {
      mockApiClient.get.mockResolvedValueOnce(mockDealsResponse);

      const { result } = renderHook(
        () =>
          useDeals({
            pipelineId: 'pipeline-123',
            stageId: 'stage-1',
            assigneeId: 'user-123',
            status: 'open',
            page: 2,
            limit: 10,
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockApiClient.get).toHaveBeenCalledWith('/deals', {
        params: {
          pipelineId: 'pipeline-123',
          stageId: 'stage-1',
          assigneeId: 'user-123',
          status: 'open',
          page: 2,
          limit: 10,
        },
      });
    });

    it('should fetch deals by status filter', async () => {
      const wonDeals = {
        deals: [{ ...mockDeal, status: 'won' as const }],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      };
      mockApiClient.get.mockResolvedValueOnce(wonDeals);

      const { result } = renderHook(() => useDeals({ status: 'won' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockApiClient.get).toHaveBeenCalledWith('/deals', {
        params: expect.objectContaining({ status: 'won' }),
      });
    });
  });

  describe('useDeal', () => {
    it('should fetch single deal by id', async () => {
      mockApiClient.get.mockResolvedValueOnce(mockDeal);

      const { result } = renderHook(() => useDeal('deal-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockApiClient.get).toHaveBeenCalledWith('/deals/deal-123');
      expect(result.current.data).toEqual(mockDeal);
    });

    it('should not fetch when id is empty', () => {
      const { result } = renderHook(() => useDeal(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
    });
  });

  describe('useCreateDeal', () => {
    it('should create deal with all fields', async () => {
      mockApiClient.post.mockResolvedValueOnce(mockDeal);

      const { result } = renderHook(() => useCreateDeal(), {
        wrapper: createWrapper(),
      });

      const newDeal = {
        title: 'Enterprise Contract',
        pipelineId: 'pipeline-123',
        stageId: 'stage-1',
        contactId: 'contact-123',
        value: '50000.00',
        expectedCloseDate: '2024-03-01',
      };

      result.current.mutate(newDeal);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockApiClient.post).toHaveBeenCalledWith('/deals', newDeal);
    });

    it('should create deal with required fields only', async () => {
      mockApiClient.post.mockResolvedValueOnce(mockDeal);

      const { result } = renderHook(() => useCreateDeal(), {
        wrapper: createWrapper(),
      });

      const minimalDeal = {
        title: 'Basic Deal',
        pipelineId: 'pipeline-123',
        stageId: 'stage-1',
        contactId: 'contact-123',
      };

      result.current.mutate(minimalDeal);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockApiClient.post).toHaveBeenCalledWith('/deals', minimalDeal);
    });
  });

  describe('useMoveDeal', () => {
    it('should move deal to another stage', async () => {
      mockApiClient.post.mockResolvedValueOnce({ success: true });

      const { result } = renderHook(() => useMoveDeal(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        id: 'deal-123',
        stageId: 'stage-2',
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockApiClient.post).toHaveBeenCalledWith('/deals/deal-123/move', {
        stageId: 'stage-2',
        order: undefined,
      });
    });

    it('should move deal to specific order', async () => {
      mockApiClient.post.mockResolvedValueOnce({ success: true });

      const { result } = renderHook(() => useMoveDeal(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        id: 'deal-123',
        stageId: 'stage-2',
        order: 3,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockApiClient.post).toHaveBeenCalledWith('/deals/deal-123/move', {
        stageId: 'stage-2',
        order: 3,
      });
    });
  });

  describe('useMarkDealWon', () => {
    it('should mark deal as won', async () => {
      mockApiClient.post.mockResolvedValueOnce({ success: true });

      const { result } = renderHook(() => useMarkDealWon(), {
        wrapper: createWrapper(),
      });

      result.current.mutate('deal-123');

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockApiClient.post).toHaveBeenCalledWith('/deals/deal-123/won');
    });
  });

  describe('useMarkDealLost', () => {
    it('should mark deal as lost without reason', async () => {
      mockApiClient.post.mockResolvedValueOnce({ success: true });

      const { result } = renderHook(() => useMarkDealLost(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ id: 'deal-123' });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockApiClient.post).toHaveBeenCalledWith('/deals/deal-123/lost', {
        reason: undefined,
      });
    });

    it('should mark deal as lost with reason', async () => {
      mockApiClient.post.mockResolvedValueOnce({ success: true });

      const { result } = renderHook(() => useMarkDealLost(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        id: 'deal-123',
        reason: 'Budget constraints',
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockApiClient.post).toHaveBeenCalledWith('/deals/deal-123/lost', {
        reason: 'Budget constraints',
      });
    });
  });
});
