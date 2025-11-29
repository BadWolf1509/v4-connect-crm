'use client';

import { type Deal, type Pipeline, apiClient } from '@/lib/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

interface PipelinesResponse {
  pipelines: Pipeline[];
}

interface DealsResponse {
  deals: Deal[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface DealFilters {
  pipelineId?: string;
  stageId?: string;
  assigneeId?: string;
  status?: 'open' | 'won' | 'lost';
  page?: number;
  limit?: number;
}

export function usePipelines() {
  return useQuery({
    queryKey: ['pipelines'],
    queryFn: () => apiClient.get<PipelinesResponse>('/pipelines'),
  });
}

export function usePipeline(id: string) {
  return useQuery({
    queryKey: ['pipelines', id],
    queryFn: () => apiClient.get<Pipeline>(`/pipelines/${id}`),
    enabled: !!id,
  });
}

export function useCreatePipeline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      name: string;
      stages?: Array<{ name: string; color?: string; order: number }>;
    }) => apiClient.post<Pipeline>('/pipelines', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipelines'] });
    },
  });
}

export function useDeals(filters: DealFilters = {}) {
  return useQuery({
    queryKey: ['deals', filters],
    queryFn: () =>
      apiClient.get<DealsResponse>('/deals', {
        params: {
          pipelineId: filters.pipelineId,
          stageId: filters.stageId,
          assigneeId: filters.assigneeId,
          status: filters.status,
          page: filters.page,
          limit: filters.limit,
        },
      }),
  });
}

export function useDeal(id: string) {
  return useQuery({
    queryKey: ['deals', id],
    queryFn: () => apiClient.get<Deal>(`/deals/${id}`),
    enabled: !!id,
  });
}

export function useCreateDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      title: string;
      pipelineId: string;
      stageId: string;
      contactId: string;
      value?: string;
      expectedCloseDate?: string;
    }) => apiClient.post<Deal>('/deals', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['pipelines'] });
    },
  });
}

export function useMoveDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, stageId, order }: { id: string; stageId: string; order?: number }) =>
      apiClient.post(`/deals/${id}/move`, { stageId, order }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['deals', id] });
      queryClient.invalidateQueries({ queryKey: ['pipelines'] });
    },
  });
}

export function useMarkDealWon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.post(`/deals/${id}/won`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['deals', id] });
      queryClient.invalidateQueries({ queryKey: ['pipelines'] });
    },
  });
}

export function useMarkDealLost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      apiClient.post(`/deals/${id}/lost`, { reason }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['deals', id] });
      queryClient.invalidateQueries({ queryKey: ['pipelines'] });
    },
  });
}
