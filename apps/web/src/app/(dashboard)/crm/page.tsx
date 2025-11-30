'use client';

import { useApi } from '@/hooks/use-api';
import type { Deal, Pipeline, Stage } from '@/lib/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DollarSign, MoreHorizontal, Plus, User } from 'lucide-react';
import { useState } from 'react';

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

function DealCard({
  deal,
  onMove: _onMove,
}: {
  deal: Deal;
  onMove: (dealId: string, stageId: string) => void;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('dealId', deal.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      className="group cursor-grab rounded-lg border border-gray-800 bg-gray-900 p-4 transition hover:border-gray-700 active:cursor-grabbing"
    >
      <div className="flex items-start justify-between">
        <h4 className="font-medium text-white">{deal.title}</h4>
        <button
          type="button"
          className="opacity-0 group-hover:opacity-100 transition text-gray-400 hover:text-white"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 space-y-2">
        {deal.value && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <DollarSign className="h-4 w-4 text-green-500" />
            <span>
              {Number(deal.value).toLocaleString('pt-BR', {
                style: 'currency',
                currency: deal.currency || 'BRL',
              })}
            </span>
          </div>
        )}

        <div className="flex items-center gap-2 text-sm text-gray-400">
          <User className="h-4 w-4" />
          <span>{deal.contact?.name || 'Sem contato'}</span>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: deal.stage?.color || '#gray' }}
        />
        <span className="text-xs text-gray-500">
          {new Date(deal.createdAt).toLocaleDateString('pt-BR')}
        </span>
      </div>
    </div>
  );
}

function StageColumn({
  stage,
  deals,
  onMoveDeal,
}: {
  stage: Stage;
  deals: Deal[];
  onMoveDeal: (dealId: string, stageId: string) => void;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const stageDeals = deals.filter((d) => d.stage?.id === stage.id);
  const totalValue = stageDeals.reduce((sum, d) => sum + Number(d.value || 0), 0);

  return (
    <div
      className={`flex h-full min-w-[300px] flex-col rounded-lg border ${
        isDragOver ? 'border-v4-red-500 bg-v4-red-500/5' : 'border-gray-800 bg-gray-900/30'
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        const dealId = e.dataTransfer.getData('dealId');
        if (dealId) {
          onMoveDeal(dealId, stage.id);
        }
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-800 p-4">
        <div className="flex items-center gap-2">
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: stage.color || '#6b7280' }}
          />
          <h3 className="font-medium text-white">{stage.name}</h3>
          <span className="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-400">
            {stageDeals.length}
          </span>
        </div>
        <button
          type="button"
          className="rounded p-1 text-gray-400 transition hover:bg-gray-800 hover:text-white"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Total Value */}
      <div className="border-b border-gray-800 px-4 py-2">
        <span className="text-sm text-gray-500">
          {totalValue.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          })}
        </span>
      </div>

      {/* Deals */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {stageDeals.map((deal) => (
          <DealCard key={deal.id} deal={deal} onMove={onMoveDeal} />
        ))}
        {stageDeals.length === 0 && (
          <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-gray-800">
            <p className="text-sm text-gray-500">Arraste deals para cá</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CRMPage() {
  const { api } = useApi();
  const queryClient = useQueryClient();
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);

  const { data: pipelinesData, isLoading: pipelinesLoading } = useQuery({
    queryKey: ['pipelines'],
    queryFn: () => api.get<PipelinesResponse>('/pipelines'),
  });

  const pipelines = pipelinesData?.pipelines || [];
  const currentPipeline =
    pipelines.find((p) => p.id === selectedPipelineId) || pipelines[0] || null;

  const { data: dealsData, isLoading: dealsLoading } = useQuery({
    queryKey: ['deals', currentPipeline?.id],
    queryFn: () =>
      api.get<DealsResponse>('/deals', {
        params: { pipelineId: currentPipeline?.id, limit: 100 },
      }),
    enabled: !!currentPipeline?.id,
  });

  const moveDeal = useMutation({
    mutationFn: ({ dealId, stageId }: { dealId: string; stageId: string }) =>
      api.post(`/deals/${dealId}/move`, { stageId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['pipelines'] });
    },
  });

  const deals = dealsData?.deals || [];
  const isLoading = pipelinesLoading || dealsLoading;

  const handleMoveDeal = (dealId: string, stageId: string) => {
    const deal = deals.find((d) => d.id === dealId);
    if (deal && deal.stage?.id !== stageId) {
      moveDeal.mutate({ dealId, stageId });
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-v4-red-500 border-t-transparent" />
      </div>
    );
  }

  if (pipelines.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <div className="rounded-full bg-gray-800 p-6">
          <DollarSign className="h-12 w-12 text-gray-600" />
        </div>
        <h2 className="mt-4 text-xl font-semibold text-white">Nenhum pipeline</h2>
        <p className="mt-2 text-gray-400">Crie seu primeiro pipeline de vendas</p>
        <button
          type="button"
          className="mt-4 rounded-lg bg-v4-red-500 px-4 py-2 font-medium text-white transition hover:bg-v4-red-600"
        >
          <Plus className="mr-2 inline h-4 w-4" />
          Criar Pipeline
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-800 p-4">
        <div>
          <h1 className="text-2xl font-bold text-white">CRM</h1>
          <p className="text-gray-400">Gerencie seus negócios</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Pipeline Tabs */}
          <div className="flex rounded-lg border border-gray-800 bg-gray-900 p-1">
            {pipelines.map((pipeline) => (
              <button
                key={pipeline.id}
                type="button"
                onClick={() => setSelectedPipelineId(pipeline.id)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  currentPipeline?.id === pipeline.id
                    ? 'bg-v4-red-500 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {pipeline.name}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="rounded-lg bg-v4-red-500 px-4 py-2 font-medium text-white transition hover:bg-v4-red-600"
          >
            <Plus className="mr-2 inline h-4 w-4" />
            Novo Deal
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto p-4">
        <div className="flex h-full gap-4">
          {currentPipeline?.stages
            ?.sort((a, b) => a.order - b.order)
            .map((stage) => (
              <StageColumn key={stage.id} stage={stage} deals={deals} onMoveDeal={handleMoveDeal} />
            ))}
          {(!currentPipeline?.stages || currentPipeline.stages.length === 0) && (
            <div className="flex h-full flex-1 items-center justify-center rounded-lg border border-dashed border-gray-800">
              <div className="text-center">
                <p className="text-gray-400">Nenhuma etapa no pipeline</p>
                <button
                  type="button"
                  className="mt-2 text-sm text-v4-red-500 hover:text-v4-red-400"
                >
                  Adicionar etapas
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
