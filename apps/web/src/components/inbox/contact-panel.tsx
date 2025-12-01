'use client';

import { useApi } from '@/hooks/use-api';
import { cn } from '@/lib/utils';
import type { Conversation } from '@/stores/inbox-store';
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  Tag,
  User,
  UserPlus,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

interface ContactPanelProps {
  conversation: Conversation;
  onClose: () => void;
  onStatusChange: (status: 'open' | 'resolved' | 'pending') => void;
  onTransfer: () => void;
  onTagsChange?: (tags: string[]) => void;
}

const statusConfig = {
  open: { label: 'Aberto', color: 'bg-blue-500', icon: MessageSquare },
  pending: { label: 'Pendente', color: 'bg-yellow-500', icon: Clock },
  resolved: { label: 'Resolvido', color: 'bg-green-500', icon: CheckCircle },
  spam: { label: 'Spam', color: 'bg-red-500', icon: AlertCircle },
};

const channelLabels: Record<string, string> = {
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  messenger: 'Messenger',
  email: 'Email',
};

export function ContactPanel({
  conversation,
  onClose,
  onStatusChange,
  onTransfer,
  onTagsChange,
}: ContactPanelProps) {
  const { api } = useApi();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [tagLoading, setTagLoading] = useState(false);
  const [localTags, setLocalTags] = useState<string[]>(conversation.tags || []);
  const [creatingDeal, setCreatingDeal] = useState(false);

  const handleStatusChange = async (status: 'open' | 'resolved' | 'pending') => {
    setLoading(true);
    try {
      await api.patch(`/conversations/${conversation.id}/status`, { status });
      onStatusChange(status);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Erro ao atualizar status');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTag = async () => {
    if (!newTag.trim()) return;
    if (localTags.includes(newTag.trim())) {
      toast.error('Tag já existe');
      return;
    }

    setTagLoading(true);
    try {
      await api.post(`/contacts/${conversation.contact.id}/tags`, { tag: newTag.trim() });
      const updatedTags = [...localTags, newTag.trim()];
      setLocalTags(updatedTags);
      onTagsChange?.(updatedTags);
      toast.success('Tag adicionada');
      setNewTag('');
    } catch (error) {
      console.error('Error adding tag:', error);
      toast.error('Erro ao adicionar tag');
    } finally {
      setTagLoading(false);
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    setTagLoading(true);
    try {
      await api.delete(
        `/contacts/${conversation.contact.id}/tags/${encodeURIComponent(tagToRemove)}`,
      );
      const updatedTags = localTags.filter((t) => t !== tagToRemove);
      setLocalTags(updatedTags);
      onTagsChange?.(updatedTags);
      toast.success('Tag removida');
    } catch (error) {
      console.error('Error removing tag:', error);
      toast.error('Erro ao remover tag');
    } finally {
      setTagLoading(false);
    }
  };

  const handleViewProfile = () => {
    router.push(`/contacts/${conversation.contact.id}`);
  };

  const handleViewHistory = () => {
    toast.info('Funcionalidade em desenvolvimento', {
      description: 'O histórico de conversas estará disponível em breve.',
    });
  };

  const handleCreateDeal = async () => {
    setCreatingDeal(true);
    try {
      // First get the default pipeline
      const pipelinesData = await api.get<{
        pipelines: Array<{ id: string; stages: Array<{ id: string; order: number }> }>;
      }>('/pipelines');
      const pipelines = pipelinesData.pipelines || [];

      if (pipelines.length === 0) {
        toast.error('Nenhum pipeline encontrado', {
          description: 'Crie um pipeline no CRM primeiro.',
        });
        return;
      }

      const defaultPipeline = pipelines[0];
      if (!defaultPipeline) {
        toast.error('Erro ao acessar pipeline');
        return;
      }
      const firstStage = defaultPipeline.stages?.sort((a, b) => a.order - b.order)[0];

      if (!firstStage) {
        toast.error('Nenhuma etapa encontrada', {
          description: 'Adicione etapas ao pipeline primeiro.',
        });
        return;
      }

      // Create the deal
      const deal = await api.post<{ id: string }>('/deals', {
        title: `Deal - ${conversation.contact.name}`,
        contactId: conversation.contact.id,
        pipelineId: defaultPipeline.id,
        stageId: firstStage.id,
      });

      toast.success('Deal criado com sucesso');
      router.push(`/crm?deal=${deal.id}`);
    } catch (error) {
      console.error('Error creating deal:', error);
      toast.error('Erro ao criar deal');
    } finally {
      setCreatingDeal(false);
    }
  };

  const _StatusIcon = statusConfig[conversation.status]?.icon || MessageSquare;

  return (
    <div className="w-80 flex-shrink-0 border-l border-gray-800 bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-800 p-4">
        <h3 className="font-medium text-white">Detalhes</h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-gray-400 hover:bg-gray-800 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Contact Info */}
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-16 w-16 rounded-full bg-gray-700 flex items-center justify-center">
              {conversation.contact.avatarUrl ? (
                <img
                  src={conversation.contact.avatarUrl}
                  alt={conversation.contact.name}
                  className="h-16 w-16 rounded-full object-cover"
                />
              ) : (
                <span className="text-2xl font-medium text-white">
                  {conversation.contact.name[0]?.toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <h4 className="font-medium text-white">{conversation.contact.name}</h4>
              <span className="text-sm text-gray-400">{channelLabels[conversation.channel]}</span>
            </div>
          </div>

          <div className="space-y-3">
            {conversation.contact.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-gray-500" />
                <span className="text-gray-300">{conversation.contact.phone}</span>
              </div>
            )}
            {conversation.contact.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-gray-500" />
                <span className="text-gray-300">{conversation.contact.email}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="text-gray-300">
                Cliente desde {new Date(conversation.lastMessageAt).toLocaleDateString('pt-BR')}
              </span>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="p-4 border-b border-gray-800">
          <h5 className="text-sm font-medium text-gray-400 mb-3">Status da Conversa</h5>
          <div className="flex items-center gap-2 mb-3">
            <div className={cn('h-2 w-2 rounded-full', statusConfig[conversation.status]?.color)} />
            <span className="text-white">{statusConfig[conversation.status]?.label}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleStatusChange('open')}
              disabled={loading || conversation.status === 'open'}
              className={cn(
                'flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition',
                conversation.status === 'open'
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'bg-gray-800 text-gray-400 hover:text-white',
              )}
            >
              <MessageSquare className="h-3 w-3" />
              Abrir
            </button>
            <button
              type="button"
              onClick={() => handleStatusChange('pending')}
              disabled={loading || conversation.status === 'pending'}
              className={cn(
                'flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition',
                conversation.status === 'pending'
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : 'bg-gray-800 text-gray-400 hover:text-white',
              )}
            >
              <Clock className="h-3 w-3" />
              Pendente
            </button>
            <button
              type="button"
              onClick={() => handleStatusChange('resolved')}
              disabled={loading || conversation.status === 'resolved'}
              className={cn(
                'flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition',
                conversation.status === 'resolved'
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-gray-800 text-gray-400 hover:text-white',
              )}
            >
              <CheckCircle className="h-3 w-3" />
              Resolver
            </button>
          </div>
        </div>

        {/* Assigned Agent */}
        <div className="p-4 border-b border-gray-800">
          <h5 className="text-sm font-medium text-gray-400 mb-3">Atendente</h5>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center">
                <User className="h-4 w-4 text-gray-400" />
              </div>
              <span className="text-sm text-white">
                {conversation.assignedTo ? 'Atribuído' : 'Não atribuído'}
              </span>
            </div>
            <button
              type="button"
              onClick={onTransfer}
              className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium bg-gray-800 text-gray-400 hover:text-white transition"
            >
              <UserPlus className="h-3 w-3" />
              Transferir
            </button>
          </div>
        </div>

        {/* Tags */}
        <div className="p-4 border-b border-gray-800">
          <h5 className="text-sm font-medium text-gray-400 mb-3">Tags</h5>
          <div className="flex flex-wrap gap-2 mb-3">
            {localTags.length > 0 ? (
              localTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-gray-800 px-2 py-1 text-xs text-gray-300 group"
                >
                  <Tag className="h-3 w-3" />
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    disabled={tagLoading}
                    className="ml-1 rounded-full p-0.5 hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remover tag"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))
            ) : (
              <span className="text-sm text-gray-500">Nenhuma tag</span>
            )}
            {tagLoading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Nova tag..."
              disabled={tagLoading}
              className="flex-1 rounded-lg border border-gray-800 bg-gray-950 px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:border-v4-red-500 focus:outline-none disabled:opacity-50"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddTag();
                }
              }}
            />
            <button
              type="button"
              onClick={handleAddTag}
              disabled={tagLoading || !newTag.trim()}
              className="rounded-lg bg-gray-800 px-3 py-1.5 text-sm text-white hover:bg-gray-700 disabled:opacity-50"
            >
              {tagLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Adicionar'}
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="p-4">
          <h5 className="text-sm font-medium text-gray-400 mb-3">Ações Rápidas</h5>
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleViewProfile}
              className="flex w-full items-center gap-2 rounded-lg bg-gray-800 px-3 py-2 text-sm text-white hover:bg-gray-700 transition"
            >
              <User className="h-4 w-4" />
              Ver perfil completo
            </button>
            <button
              type="button"
              onClick={handleViewHistory}
              className="flex w-full items-center gap-2 rounded-lg bg-gray-800 px-3 py-2 text-sm text-white hover:bg-gray-700 transition"
            >
              <MessageSquare className="h-4 w-4" />
              Ver histórico de conversas
            </button>
            <button
              type="button"
              onClick={handleCreateDeal}
              disabled={creatingDeal}
              className="flex w-full items-center gap-2 rounded-lg bg-gray-800 px-3 py-2 text-sm text-white hover:bg-gray-700 transition disabled:opacity-50"
            >
              {creatingDeal ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <DollarSign className="h-4 w-4" />
              )}
              Criar deal no CRM
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
