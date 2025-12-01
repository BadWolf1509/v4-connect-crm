'use client';

import { useApi } from '@/hooks/use-api';
import type { Deal, Stage } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  DollarSign,
  Edit2,
  Loader2,
  Mail,
  MessageSquare,
  MoreVertical,
  Phone,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { useState } from 'react';

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

export function DealDrawer({ deal, stages, onClose, onEdit }: DealDrawerProps) {
  const { api } = useApi();
  const queryClient = useQueryClient();
  const [showMenu, setShowMenu] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  const deleteDeal = useMutation({
    mutationFn: () => api.delete(`/deals/${deal.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      onClose();
    },
  });

  const addNote = useMutation({
    mutationFn: (note: string) =>
      api.post(`/deals/${deal.id}/activities`, {
        type: 'note',
        description: note,
      }),
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

  // Fetch activities from API
  const { data: activitiesData, isLoading: activitiesLoading } = useQuery({
    queryKey: ['deal-activities', deal.id],
    queryFn: () => api.get<{ activities: Activity[] }>(`/deals/${deal.id}/activities`),
  });

  // Use API data or fallback to basic activities
  const activities: Activity[] = activitiesData?.activities || [
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

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-96 border-l border-gray-800 bg-gray-900 shadow-xl flex flex-col">
      {/* Header */}
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
              onClick={() => setShowMenu(!showMenu)}
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

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Value & Stage */}
        <div className="border-b border-gray-800 p-4 space-y-4">
          {/* Value */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-400">
              <DollarSign className="h-4 w-4" />
              <span className="text-sm">Valor</span>
            </div>
            <span className="text-lg font-semibold text-green-400">
              {deal.value
                ? Number(deal.value).toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: deal.currency || 'BRL',
                  })
                : '-'}
            </span>
          </div>

          {/* Stage Selector */}
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

          {/* Probability */}
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

          {/* Expected Close Date */}
          {deal.expectedCloseDate && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-400">
                <Calendar className="h-4 w-4" />
                <span className="text-sm">Previsao</span>
              </div>
              <span className="text-sm text-white">
                {new Date(deal.expectedCloseDate).toLocaleDateString('pt-BR')}
              </span>
            </div>
          )}
        </div>

        {/* Contact */}
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
                className="flex items-center gap-1 rounded-lg bg-gray-800 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700"
              >
                <MessageSquare className="h-3 w-3" />
                Mensagem
              </button>
            </div>
          </div>
        )}

        {/* Notes */}
        {deal.notes && (
          <div className="border-b border-gray-800 p-4">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Notas</h3>
            <p className="text-sm text-white whitespace-pre-wrap">{deal.notes}</p>
          </div>
        )}

        {/* Activities */}
        <div className="p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-3">Atividades</h3>

          {/* Add Note */}
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

          {/* Activity List */}
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
                  {activity.type === 'note' && <MessageSquare className="h-4 w-4 text-blue-400" />}
                  {activity.type === 'call' && <Phone className="h-4 w-4 text-green-400" />}
                  {activity.type === 'email' && <Mail className="h-4 w-4 text-purple-400" />}
                  {activity.type === 'meeting' && <Calendar className="h-4 w-4 text-orange-400" />}
                  {activity.type === 'stage_change' && <User className="h-4 w-4 text-gray-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white">{activity.description}</p>
                  <p className="text-xs text-gray-500">
                    {activity.user?.name} •{' '}
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
        </div>
      </div>
    </div>
  );
}
