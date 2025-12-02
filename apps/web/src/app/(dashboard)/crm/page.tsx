'use client';

import { DealDrawer, DealModal } from '@/components/crm';
import { useApi } from '@/hooks/use-api';
import type { Deal, Pipeline, Stage } from '@/lib/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DollarSign, Loader2, MoreHorizontal, Plus, Search, User, X } from 'lucide-react';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

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
  onOpenDrawer,
}: {
  deal: Deal;
  onMove: (dealId: string, stageId: string) => void;
  onOpenDrawer: (deal: Deal) => void;
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
          onClick={(e) => {
            e.stopPropagation();
            onOpenDrawer(deal);
          }}
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
  onOpenDrawer,
  onAddDeal,
}: {
  stage: Stage;
  deals: Deal[];
  onMoveDeal: (dealId: string, stageId: string) => void;
  onOpenDrawer: (deal: Deal) => void;
  onAddDeal: (stageId: string) => void;
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
          onClick={() => onAddDeal(stage.id)}
          className="rounded p-1 text-gray-400 transition hover:bg-gray-800 hover:text-white"
          title="Adicionar deal nesta etapa"
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
          <DealCard key={deal.id} deal={deal} onMove={onMoveDeal} onOpenDrawer={onOpenDrawer} />
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

  // Modal and Drawer states
  const [isDealModalOpen, setIsDealModalOpen] = useState(false);
  const [isDealDrawerOpen, setIsDealDrawerOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [presetStageId, setPresetStageId] = useState<string | null>(null);

  // Pipeline and Stage modal states
  const [showPipelineModal, setShowPipelineModal] = useState(false);
  const [newPipelineName, setNewPipelineName] = useState('');
  const [showStageModal, setShowStageModal] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [newStageColor, setNewStageColor] = useState('#3b82f6');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

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

  const createPipeline = useMutation({
    mutationFn: (name: string) => api.post<{ pipeline: Pipeline }>('/pipelines', { name }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pipelines'] });
      setSelectedPipelineId(data.pipeline.id);
      setShowPipelineModal(false);
      setNewPipelineName('');
      toast.success('Pipeline criado com sucesso');
    },
    onError: () => {
      toast.error('Erro ao criar pipeline');
    },
  });

  const createStage = useMutation({
    mutationFn: ({
      pipelineId,
      name,
      color,
    }: { pipelineId: string; name: string; color: string }) =>
      api.post(`/pipelines/${pipelineId}/stages`, { name, color }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipelines'] });
      setShowStageModal(false);
      setNewStageName('');
      setNewStageColor('#3b82f6');
      toast.success('Etapa adicionada com sucesso');
    },
    onError: () => {
      toast.error('Erro ao adicionar etapa');
    },
  });

  const deals = dealsData?.deals || [];

  // Filter deals by search query
  const filteredDeals = searchQuery
    ? deals.filter(
        (deal) =>
          deal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          deal.contact?.name?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : deals;
  const isLoading = pipelinesLoading || dealsLoading;

  const handleMoveDeal = (dealId: string, stageId: string) => {
    const deal = deals.find((d) => d.id === dealId);
    if (deal && deal.stage?.id !== stageId) {
      moveDeal.mutate({ dealId, stageId });
    }
  };

  // Handlers for modal and drawer
  const handleNewDeal = useCallback(() => {
    setSelectedDeal(null);
    setPresetStageId(null);
    setIsDealModalOpen(true);
  }, []);

  const handleNewDealFromStage = useCallback((stageId: string) => {
    setSelectedDeal(null);
    setPresetStageId(stageId);
    setIsDealModalOpen(true);
  }, []);

  const handleOpenDealDrawer = useCallback((deal: Deal) => {
    setSelectedDeal(deal);
    setIsDealDrawerOpen(true);
  }, []);

  const handleEditDeal = useCallback(() => {
    setIsDealDrawerOpen(false);
    setIsDealModalOpen(true);
  }, []);

  const handleCloseDealModal = useCallback(() => {
    setIsDealModalOpen(false);
    setSelectedDeal(null);
    setPresetStageId(null);
  }, []);

  const handleCloseDealDrawer = useCallback(() => {
    setIsDealDrawerOpen(false);
    setSelectedDeal(null);
  }, []);

  const handleCreatePipeline = useCallback(() => {
    if (!newPipelineName.trim()) {
      toast.error('Digite um nome para o pipeline');
      return;
    }
    createPipeline.mutate(newPipelineName.trim());
  }, [newPipelineName, createPipeline]);

  const handleCreateStage = useCallback(() => {
    if (!newStageName.trim()) {
      toast.error('Digite um nome para a etapa');
      return;
    }
    if (!currentPipeline?.id) return;
    createStage.mutate({
      pipelineId: currentPipeline.id,
      name: newStageName.trim(),
      color: newStageColor,
    });
  }, [newStageName, newStageColor, currentPipeline?.id, createStage]);

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
          onClick={() => setShowPipelineModal(true)}
          className="mt-4 rounded-lg bg-v4-red-500 px-4 py-2 font-medium text-white transition hover:bg-v4-red-600"
        >
          <Plus className="mr-2 inline h-4 w-4" />
          Criar Pipeline
        </button>

        {/* Pipeline Modal */}
        {showPipelineModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-md rounded-lg border border-gray-800 bg-gray-900 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Novo Pipeline</h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowPipelineModal(false);
                    setNewPipelineName('');
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="pipeline-name"
                    className="block text-sm font-medium text-gray-300 mb-2"
                  >
                    Nome do Pipeline
                  </label>
                  <input
                    id="pipeline-name"
                    type="text"
                    value={newPipelineName}
                    onChange={(e) => setNewPipelineName(e.target.value)}
                    placeholder="Ex: Vendas B2B"
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:border-v4-red-500 focus:outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreatePipeline();
                    }}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPipelineModal(false);
                      setNewPipelineName('');
                    }}
                    className="rounded-lg px-4 py-2 text-gray-400 hover:bg-gray-800 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleCreatePipeline}
                    disabled={createPipeline.isPending}
                    className="flex items-center gap-2 rounded-lg bg-v4-red-500 px-4 py-2 font-medium text-white hover:bg-v4-red-600 disabled:opacity-50"
                  >
                    {createPipeline.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Criando...
                      </>
                    ) : (
                      'Criar Pipeline'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-800 p-6">
        <div>
          <h1 className="text-white">CRM</h1>
          <p className="text-gray-400">Gerencie seus negócios</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar deals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 rounded-lg border border-gray-700 bg-gray-800 py-2 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:border-v4-red-500 focus:outline-none"
            />
          </div>
          {/* Pipeline Tabs */}
          <div className="flex items-center rounded-lg border border-gray-800 bg-gray-900 p-1">
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
            <button
              type="button"
              onClick={() => setShowPipelineModal(true)}
              className="ml-1 rounded-md p-1.5 text-gray-400 hover:bg-gray-800 hover:text-white"
              title="Criar novo pipeline"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={handleNewDeal}
            className="rounded-lg bg-v4-red-500 px-4 py-2 font-medium text-white transition hover:bg-v4-red-600"
          >
            <Plus className="mr-2 inline h-4 w-4" />
            Novo Deal
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto p-6">
        <div className="flex h-full gap-4">
          {currentPipeline?.stages
            ?.sort((a, b) => a.order - b.order)
            .map((stage) => (
              <StageColumn
                key={stage.id}
                stage={stage}
                deals={filteredDeals}
                onMoveDeal={handleMoveDeal}
                onOpenDrawer={handleOpenDealDrawer}
                onAddDeal={handleNewDealFromStage}
              />
            ))}
          {(!currentPipeline?.stages || currentPipeline.stages.length === 0) && (
            <div className="flex h-full flex-1 items-center justify-center rounded-lg border border-dashed border-gray-800">
              <div className="text-center">
                <p className="text-gray-400">Nenhuma etapa no pipeline</p>
                <button
                  type="button"
                  onClick={() => setShowStageModal(true)}
                  className="mt-2 text-sm text-v4-red-500 hover:text-v4-red-400"
                >
                  Adicionar etapas
                </button>
              </div>
            </div>
          )}
          {/* Add Stage Button */}
          {currentPipeline?.stages && currentPipeline.stages.length > 0 && (
            <button
              type="button"
              onClick={() => setShowStageModal(true)}
              className="flex h-full min-w-[200px] flex-col items-center justify-center rounded-lg border border-dashed border-gray-800 text-gray-500 transition hover:border-gray-700 hover:text-gray-400"
            >
              <Plus className="h-8 w-8" />
              <span className="mt-2 text-sm">Nova Etapa</span>
            </button>
          )}
        </div>
      </div>

      {/* Deal Modal */}
      <DealModal
        isOpen={isDealModalOpen}
        onClose={handleCloseDealModal}
        pipelineId={currentPipeline?.id || ''}
        stages={currentPipeline?.stages || []}
        deal={selectedDeal}
        defaultStageId={presetStageId}
      />

      {/* Deal Drawer */}
      {selectedDeal && isDealDrawerOpen && (
        <DealDrawer
          deal={selectedDeal}
          stages={currentPipeline?.stages || []}
          onClose={handleCloseDealDrawer}
          onEdit={handleEditDeal}
        />
      )}

      {/* Pipeline Modal */}
      {showPipelineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg border border-gray-800 bg-gray-900 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Novo Pipeline</h3>
              <button
                type="button"
                onClick={() => {
                  setShowPipelineModal(false);
                  setNewPipelineName('');
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="new-pipeline-name"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  Nome do Pipeline
                </label>
                <input
                  id="new-pipeline-name"
                  type="text"
                  value={newPipelineName}
                  onChange={(e) => setNewPipelineName(e.target.value)}
                  placeholder="Ex: Vendas B2B"
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:border-v4-red-500 focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreatePipeline();
                  }}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPipelineModal(false);
                    setNewPipelineName('');
                  }}
                  className="rounded-lg px-4 py-2 text-gray-400 hover:bg-gray-800 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleCreatePipeline}
                  disabled={createPipeline.isPending}
                  className="flex items-center gap-2 rounded-lg bg-v4-red-500 px-4 py-2 font-medium text-white hover:bg-v4-red-600 disabled:opacity-50"
                >
                  {createPipeline.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    'Criar Pipeline'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stage Modal */}
      {showStageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg border border-gray-800 bg-gray-900 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Nova Etapa</h3>
              <button
                type="button"
                onClick={() => {
                  setShowStageModal(false);
                  setNewStageName('');
                  setNewStageColor('#3b82f6');
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="stage-name"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  Nome da Etapa
                </label>
                <input
                  id="stage-name"
                  type="text"
                  value={newStageName}
                  onChange={(e) => setNewStageName(e.target.value)}
                  placeholder="Ex: Qualificação"
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:border-v4-red-500 focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateStage();
                  }}
                />
              </div>
              <div>
                <label
                  htmlFor="stage-color"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  Cor
                </label>
                <div className="flex items-center gap-3">
                  <input
                    id="stage-color"
                    type="color"
                    value={newStageColor}
                    onChange={(e) => setNewStageColor(e.target.value)}
                    className="h-10 w-10 cursor-pointer rounded border border-gray-700 bg-gray-800"
                  />
                  <div className="flex gap-2">
                    {[
                      '#ef4444',
                      '#f97316',
                      '#eab308',
                      '#22c55e',
                      '#3b82f6',
                      '#8b5cf6',
                      '#ec4899',
                    ].map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewStageColor(color)}
                        className={`h-8 w-8 rounded-full border-2 ${newStageColor === color ? 'border-white' : 'border-transparent'}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowStageModal(false);
                    setNewStageName('');
                    setNewStageColor('#3b82f6');
                  }}
                  className="rounded-lg px-4 py-2 text-gray-400 hover:bg-gray-800 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleCreateStage}
                  disabled={createStage.isPending}
                  className="flex items-center gap-2 rounded-lg bg-v4-red-500 px-4 py-2 font-medium text-white hover:bg-v4-red-600 disabled:opacity-50"
                >
                  {createStage.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Adicionando...
                    </>
                  ) : (
                    'Adicionar Etapa'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
