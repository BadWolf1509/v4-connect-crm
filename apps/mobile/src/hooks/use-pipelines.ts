import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

export interface Stage {
  id: string;
  name: string;
  color: string;
  order: number;
}

export interface Deal {
  id: string;
  title: string;
  value: string | null;
  currency: string;
  stageId: string;
  contactId: string | null;
  assignedToId: string | null;
  closedAt: string | null;
  createdAt: string;
  contact?: {
    id: string;
    name: string;
  } | null;
  stage?: Stage | null;
}

export interface Pipeline {
  id: string;
  name: string;
  stages: Stage[];
}

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

export function usePipelines() {
  return useQuery({
    queryKey: ['pipelines'],
    queryFn: () => api.get<PipelinesResponse>('/pipelines'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useDeals(pipelineId?: string, page = 1, limit = 100) {
  return useQuery({
    queryKey: ['deals', pipelineId, page],
    queryFn: () =>
      api.get<DealsResponse>('/deals', {
        params: { pipelineId, page, limit },
      }),
    enabled: !!pipelineId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useMoveDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ dealId, stageId }: { dealId: string; stageId: string }) =>
      api.post(`/deals/${dealId}/move`, { stageId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['pipelines'] });
    },
  });
}

export function useCreateDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      title: string;
      pipelineId: string;
      stageId: string;
      value?: number;
      contactId?: string;
    }) => api.post<Deal>('/deals', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
    },
  });
}
