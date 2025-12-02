'use client';

import { useApi } from '@/hooks/use-api';
import type { Deal, Stage } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  Calendar,
  CheckCircle,
  DollarSign,
  Edit2,
  History,
  Loader2,
  Mail,
  MessageSquare,
  MoreVertical,
  Phone,
  Plus,
  Trash2,
  User,
  UserPlus,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

interface DealDrawerProps {
  deal: Deal;
  stages: Stage[];
  onClose: () => void;
  onEdit: () => void;
}

interface Activity {
  id: string;
  type: 'note' | 'call' | 'email' | 'meeting' | 'stage_change';
  description: string;
  createdAt: string;
  user?: { name: string };
}

interface DealHistoryItem {
  id: string;
  type: string;
  previousValue: unknown;
  newValue: unknown;
  metadata: Record<string, unknown>;
  createdAt: string;
  user: { id: string; name: string; email: string } | null;
}

type TabType = 'activities' | 'history';

const formatCurrency = (value?: string | number, currency = 'BRL') => {
  if (!value) return '-';
  const numericValue = Number(value);
  return Number.isNaN(numericValue)
    ? '-'
    : numericValue.toLocaleString('pt-BR', { style: 'currency', currency });
};

const getHistoryIcon = (type: string) => {
  switch (type) {
    case 'created':
      return { icon: Plus, color: 'text-green-400', bg: 'bg-green-500/20' };
    case 'stage_changed':
      return { icon: ArrowRight, color: 'text-blue-400', bg: 'bg-blue-500/20' };
    case 'status_changed':
      return { icon: CheckCircle, color: 'text-purple-400', bg: 'bg-purple-500/20' };
    case 'assignee_changed':
      return { icon: UserPlus, color: 'text-orange-400', bg: 'bg-orange-500/20' };
    case 'value_changed':
      return { icon: DollarSign, color: 'text-green-400', bg: 'bg-green-500/20' };
    case 'field_updated':
      return { icon: Edit2, color: 'text-gray-400', bg: 'bg-gray-500/20' };
    case 'note_added':
      return { icon: MessageSquare, color: 'text-blue-400', bg: 'bg-blue-500/20' };
    case 'activity_added':
      return { icon: Calendar, color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
    default:
      return { icon: History, color: 'text-gray-400', bg: 'bg-gray-500/20' };
  }
};

const formatHistoryDescription = (item: DealHistoryItem): string => {
  switch (item.type) {
    case 'created':
      return 'Deal criado';
    case 'stage_changed': {
      const prev = item.previousValue as { name?: string } | null;
      const next = item.newValue as { name?: string } | null;
      return `Movido de "${prev?.name || '?'}" para "${next?.name || '?'}"`;
    }
    case 'status_changed': {
      const statusMap: Record<string, string> = { open: 'Aberto', won: 'Ganho', lost: 'Perdido' };
      return `Status alterado para "${statusMap[item.newValue as string] || item.newValue}"`;
    }
    case 'assignee_changed': {
      const prev = item.previousValue as { name?: string } | null;
      const next = item.newValue as { name?: string } | null;
      if (!prev && next) return `Atribuído a ${next.name}`;
      if (prev && !next) return 'Atribuição removida';
      return `Reatribuído de ${prev?.name || '?'} para ${next?.name || '?'}`;
    }
    case 'value_changed': {
      const prev = formatCurrency(item.previousValue as string | number | undefined);
      const next = formatCurrency(item.newValue as string | number | undefined);
      return `Valor alterado de ${prev} para ${next}`;
    }
    case 'field_updated':
      return 'Campos atualizados';
    case 'note_added':
      return 'Nota adicionada';
    case 'activity_added': {
      const data = item.newValue as { type?: string; title?: string } | null;
      return `Atividade adicionada: ${data?.title || data?.type || ''}`;
    }
    default:
      return item.type;
  }
};

export function DealDrawer({ deal, stages, onClose, onEdit }: DealDrawerProps) {
  const { api } = useApi();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showMenu, setShowMenu] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('activities');

  const handleOpenConversation = async () => {
    if (!deal.contact?.phone) {
      toast.error('Contato não possui telefone cadastrado');
      return;
    }

    try {
      const response = await api.get<{ conversations: Array<{ id: string }> }>('/conversations', {
        params: { contactId: deal.contact.id, limit: 1 },
      });
      const firstConversation = response.conversations?.[0];
      if (firstConversation) {
        router.push(`/inbox?conversation=${firstConversation.id}`);
      } else {
        toast.info('Nenhuma conversa encontrada. Inicie uma nova conversa na Inbox.');
        router.push('/inbox');
      }
    } catch (error) {
      console.error('Error finding conversation:', error);
      toast.error('Erro ao buscar conversa');
    }
  };

  const deleteDeal = useMutation({
    mutationFn: () => api.delete(`/deals/${deal.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      onClose();
    },
  });

  const addNote = useMutation({
    mutationFn: (note: string) =>
      api.post(`/deals/${deal.id}/activities`, { type: 'note', description: note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['deal-activities', deal.id] });
      setNewNote('');
      setAddingNote(false);
    },
  });

  const moveDeal = useMutation({
    mutationFn: (stageId: string) => api.post(`/deals/${deal.id}/move`, { stageId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
    },
  });

  const handleAddNote = () => {
    if (newNote.trim()) {
      addNote.mutate(newNote);
    }
  };

  const { data: activitiesData } = useQuery({
    queryKey: ['deal-activities', deal.id],
    queryFn: () => api.get<{ activities: Activity[] }>(`/deals/${deal.id}/activities`),
  });

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['deal-history', deal.id],
    queryFn: () => api.get<{ history: DealHistoryItem[] }>(`/deals/${deal.id}/history`),
    enabled: activeTab === 'history',
  });

  const activities: Activity[] =
    activitiesData?.activities && activitiesData.activities.length > 0
      ? activitiesData.activities
      : [
          {
            id: 'fallback-1',
            type: 'stage_change',
            description: `Movido para ${deal.stage?.name}`,
            createdAt: deal.updatedAt,
            user: { name: 'Sistema' },
          },
          {
            id: 'fallback-2',
            type: 'note',
            description: 'Deal criado',
            createdAt: deal.createdAt,
            user: { name: 'Sistema' },
          },
        ];

  const history = historyData?.history || [];

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-96 border-l border-gray-800 bg-gray-900 shadow-xl flex flex-col">
      <div className="flex items-center justify-between border-b border-gray-800 p-4">
        <h2 className="font-semibold text-white truncate">{deal.title}</h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white"
            title="Editar"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMenu((prev) => !prev)}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 rounded-lg border border-gray-800 bg-gray-950 py-1 shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Tem certeza que deseja excluir este deal?')) {
                      deleteDeal.mutate();
                    }
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-gray-800"
                >
                  <Trash2 className="h-4 w-4" />
                  Excluir
                </button>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="border-b border-gray-800 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-400">
              <DollarSign className="h-4 w-4" />
              <span className="text-sm">Valor</span>
            </div>
            <span className="text-lg font-semibold text-green-400">
              {formatCurrency(deal.value, deal.currency || 'BRL')}
            </span>
          </div>

          <div>
            <span className="block text-sm text-gray-400 mb-2">Etapa</span>
            <div className="flex flex-wrap gap-2">
              {stages.map((stage) => (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => moveDeal.mutate(stage.id)}
                  disabled={moveDeal.isPending}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium transition',
                    deal.stage?.id === stage.id
                      ? 'text-white'
                      : 'bg-gray-800 text-gray-400 hover:text-white',
                  )}
                  style={{
                    backgroundColor:
                      deal.stage?.id === stage.id ? stage.color || '#ef4444' : undefined,
                  }}
                >
                  {stage.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-400">Probabilidade</span>
              <span className="text-sm font-medium text-white">{deal.probability || 50}%</span>
            </div>
            <div className="h-2 rounded-full bg-gray-800">
              <div
                className="h-full rounded-full bg-v4-red-500"
                style={{ width: `${deal.probability || 50}%` }}
              />
            </div>
          </div>

          {deal.expectedCloseDate && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-400">
                <Calendar className="h-4 w-4" />
                <span className="text-sm">Previsão</span>
              </div>
              <span className="text-sm text-white">
                {new Date(deal.expectedCloseDate).toLocaleDateString('pt-BR')}
              </span>
            </div>
          )}
        </div>

        {deal.contact && (
          <div className="border-b border-gray-800 p-4">
            <h3 className="text-sm font-medium text-gray-400 mb-3">Contato</h3>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gray-700 flex items-center justify-center">
                <span className="font-medium text-white">
                  {deal.contact.name[0]?.toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white truncate">{deal.contact.name}</p>
                <p className="text-sm text-gray-400 truncate">
                  {deal.contact.phone || deal.contact.email}
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              {deal.contact.phone && (
                <a
                  href={`tel:${deal.contact.phone}`}
                  className="flex items-center gap-1 rounded-lg bg-gray-800 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700"
                >
                  <Phone className="h-3 w-3" />
                  Ligar
                </a>
              )}
              {deal.contact.email && (
                <a
                  href={`mailto:${deal.contact.email}`}
                  className="flex items-center gap-1 rounded-lg bg-gray-800 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700"
                >
                  <Mail className="h-3 w-3" />
                  Email
                </a>
              )}
              <button
                type="button"
                onClick={handleOpenConversation}
                className="flex items-center gap-1 rounded-lg bg-gray-800 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700"
              >
                <MessageSquare className="h-3 w-3" />
                Mensagem
              </button>
            </div>
          </div>
        )}

        {deal.notes && (
          <div className="border-b border-gray-800 p-4">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Notas</h3>
            <p className="text-sm text-white whitespace-pre-wrap">{deal.notes}</p>
          </div>
        )}

        <div className="border-b border-gray-800">
          <div className="flex">
            <button
              type="button"
              onClick={() => setActiveTab('activities')}
              className={cn(
                'flex-1 px-4 py-3 text-sm font-medium transition',
                activeTab === 'activities'
                  ? 'text-white border-b-2 border-v4-red-500'
                  : 'text-gray-400 hover:text-white',
              )}
            >
              Atividades
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={cn(
                'flex-1 px-4 py-3 text-sm font-medium transition flex items-center justify-center gap-2',
                activeTab === 'history'
                  ? 'text-white border-b-2 border-v4-red-500'
                  : 'text-gray-400 hover:text-white',
              )}
            >
              <History className="h-4 w-4" />
              Histórico
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {activeTab === 'activities' && (
            <>
              {addingNote ? (
                <div className="mb-4 space-y-2">
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Adicionar nota..."
                    rows={3}
                    className="w-full rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-v4-red-500 focus:outline-none resize-none"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAddingNote(false);
                        setNewNote('');
                      }}
                      className="rounded px-3 py-1 text-sm text-gray-400 hover:text-white"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleAddNote}
                      disabled={!newNote.trim() || addNote.isPending}
                      className="flex items-center gap-1 rounded bg-v4-red-500 px-3 py-1 text-sm text-white hover:bg-v4-red-600 disabled:opacity-50"
                    >
                      {addNote.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                      Adicionar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingNote(true)}
                  className="mb-4 w-full rounded-lg border border-dashed border-gray-800 py-2 text-sm text-gray-400 hover:border-gray-700 hover:text-white"
                >
                  + Adicionar nota
                </button>
              )}

              <div className="space-y-3">
                {activities.map((activity) => (
                  <div key={activity.id} className="flex gap-3">
                    <div
                      className={cn(
                        'h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0',
                        activity.type === 'note' && 'bg-blue-500/20',
                        activity.type === 'call' && 'bg-green-500/20',
                        activity.type === 'email' && 'bg-purple-500/20',
                        activity.type === 'meeting' && 'bg-orange-500/20',
                        activity.type === 'stage_change' && 'bg-gray-800',
                      )}
                    >
                      {activity.type === 'note' && (
                        <MessageSquare className="h-4 w-4 text-blue-400" />
                      )}
                      {activity.type === 'call' && <Phone className="h-4 w-4 text-green-400" />}
                      {activity.type === 'email' && <Mail className="h-4 w-4 text-purple-400" />}
                      {activity.type === 'meeting' && (
                        <Calendar className="h-4 w-4 text-orange-400" />
                      )}
                      {activity.type === 'stage_change' && (
                        <User className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white">{activity.description}</p>
                      <p className="text-xs text-gray-500">
                        {activity.user?.name || 'Sistema'} -{' '}
                        {new Date(activity.createdAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeTab === 'history' &&
            (historyLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum histórico registrado</p>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-800" />
                <div className="space-y-4">
                  {history.map((item) => {
                    const { icon: Icon, color, bg } = getHistoryIcon(item.type);
                    return (
                      <div key={item.id} className="flex gap-3 relative">
                        <div
                          className={cn(
                            'h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 z-10',
                            bg,
                          )}
                        >
                          <Icon className={cn('h-4 w-4', color)} />
                        </div>
                        <div className="flex-1 min-w-0 pt-1">
                          <p className="text-sm text-white">{formatHistoryDescription(item)}</p>
                          <p className="text-xs text-gray-500">
                            {item.user?.name || 'Sistema'} -{' '}
                            {new Date(item.createdAt).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
