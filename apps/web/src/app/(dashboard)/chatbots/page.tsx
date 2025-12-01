'use client';

import { useApi } from '@/hooks/use-api';
import { cn } from '@/lib/utils';
import {
  Bot,
  Loader2,
  MessageSquare,
  MoreVertical,
  Pause,
  Play,
  Plus,
  Settings,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

interface FlowNode {
  id: string;
  type: string;
  name?: string;
  config: Record<string, unknown>;
}

interface Chatbot {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  triggerType: 'keyword' | 'always' | 'schedule';
  triggerConfig: Record<string, unknown>;
  createdAt: string;
  channel?: {
    id: string;
    name: string;
    type: string;
  };
  nodes?: FlowNode[];
}

interface Channel {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
}

const triggerTypeLabels: Record<string, string> = {
  keyword: 'Por palavra-chave',
  always: 'Sempre',
  schedule: 'Agendado',
};

export default function ChatbotsPage() {
  const { api, isAuthenticated } = useApi();
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingChatbot, setEditingChatbot] = useState<Chatbot | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    channelId: '',
    triggerType: 'keyword' as 'keyword' | 'always' | 'schedule',
    keywords: [] as string[],
  });
  const [keywordInput, setKeywordInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Channels for form
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(false);

  const fetchChatbots = useCallback(async () => {
    if (!isAuthenticated) return;

    setLoading(true);
    try {
      const data = await api.get<{ chatbots: Chatbot[] }>('/chatbots');
      setChatbots(data.chatbots || []);
    } catch (err) {
      console.error('Failed to fetch chatbots:', err);
      toast.error('Erro ao carregar chatbots');
    } finally {
      setLoading(false);
    }
  }, [api, isAuthenticated]);

  const fetchChannels = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoadingChannels(true);
    try {
      const data = await api.get<{ data: Channel[] }>('/channels');
      setChannels((data.data || []).filter((c) => c.isActive));
    } catch (err) {
      console.error('Failed to fetch channels:', err);
    } finally {
      setLoadingChannels(false);
    }
  }, [api, isAuthenticated]);

  useEffect(() => {
    fetchChatbots();
  }, [fetchChatbots]);

  const handleOpenModal = (chatbot?: Chatbot) => {
    if (chatbot) {
      setEditingChatbot(chatbot);
      setFormData({
        name: chatbot.name,
        description: chatbot.description || '',
        channelId: chatbot.channel?.id || '',
        triggerType: chatbot.triggerType,
        keywords: (chatbot.triggerConfig?.keywords as string[]) || [],
      });
    } else {
      setEditingChatbot(null);
      setFormData({
        name: '',
        description: '',
        channelId: '',
        triggerType: 'keyword',
        keywords: [],
      });
    }
    setFormError(null);
    setKeywordInput('');
    fetchChannels();
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingChatbot(null);
  };

  const handleAddKeyword = () => {
    const keyword = keywordInput.trim().toLowerCase();
    if (keyword && !formData.keywords.includes(keyword)) {
      setFormData({ ...formData, keywords: [...formData.keywords, keyword] });
    }
    setKeywordInput('');
  };

  const handleRemoveKeyword = (keywordToRemove: string) => {
    setFormData({
      ...formData,
      keywords: formData.keywords.filter((k) => k !== keywordToRemove),
    });
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setFormError('Nome é obrigatório');
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description || undefined,
        channelId: formData.channelId || undefined,
        triggerType: formData.triggerType,
        triggerConfig: {
          keywords: formData.keywords,
        },
      };

      if (editingChatbot) {
        await api.patch(`/chatbots/${editingChatbot.id}`, payload);
        toast.success('Chatbot atualizado');
      } else {
        await api.post('/chatbots', payload);
        toast.success('Chatbot criado');
      }
      handleCloseModal();
      fetchChatbots();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao salvar chatbot');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (chatbot: Chatbot) => {
    try {
      await api.post(`/chatbots/${chatbot.id}/toggle`, {});
      toast.success(chatbot.isActive ? 'Chatbot desativado' : 'Chatbot ativado');
      fetchChatbots();
    } catch (err) {
      toast.error('Erro ao alterar status');
      console.error('Toggle error:', err);
    }
    setMenuOpen(null);
  };

  const handleDelete = async (chatbotId: string) => {
    if (!confirm('Tem certeza que deseja excluir este chatbot?')) return;

    try {
      await api.delete(`/chatbots/${chatbotId}`);
      toast.success('Chatbot excluído');
      fetchChatbots();
    } catch (err) {
      toast.error('Erro ao excluir chatbot');
      console.error('Delete error:', err);
    }
    setMenuOpen(null);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Chatbots</h2>
          <p className="text-sm text-gray-400">Crie fluxos de automação para suas conversas</p>
        </div>
        <button
          type="button"
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 rounded-lg bg-v4-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-v4-red-600"
        >
          <Plus className="h-4 w-4" />
          Novo Chatbot
        </button>
      </div>

      {/* Chatbots List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : chatbots.length === 0 ? (
        <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-12 text-center">
          <Bot className="mx-auto h-12 w-12 text-gray-600" />
          <h3 className="mt-4 text-lg font-medium text-white">Nenhum chatbot</h3>
          <p className="mt-2 text-sm text-gray-400">
            Crie seu primeiro chatbot para automatizar conversas
          </p>
          <button
            type="button"
            onClick={() => handleOpenModal()}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-v4-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-v4-red-600"
          >
            <Plus className="h-4 w-4" />
            Criar Chatbot
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {chatbots.map((chatbot) => (
            <div
              key={chatbot.id}
              className="relative rounded-lg border border-gray-800 bg-gray-900/50 p-4"
            >
              {/* Menu */}
              <div className="absolute right-2 top-2">
                <button
                  type="button"
                  onClick={() => setMenuOpen(menuOpen === chatbot.id ? null : chatbot.id)}
                  className="rounded p-1 text-gray-400 hover:bg-gray-800 hover:text-white"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
                {menuOpen === chatbot.id && (
                  <div className="absolute right-0 top-8 z-10 w-40 rounded-lg border border-gray-800 bg-gray-900 py-1 shadow-lg">
                    <button
                      type="button"
                      onClick={() => {
                        handleOpenModal(chatbot);
                        setMenuOpen(null);
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:bg-gray-800 hover:text-white"
                    >
                      <Settings className="h-4 w-4" />
                      Configurar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(chatbot)}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:bg-gray-800 hover:text-white"
                    >
                      {chatbot.isActive ? (
                        <>
                          <Pause className="h-4 w-4" />
                          Desativar
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4" />
                          Ativar
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(chatbot.id)}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-gray-800"
                    >
                      <Trash2 className="h-4 w-4" />
                      Excluir
                    </button>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex items-start gap-4 pr-8">
                <div
                  className={cn(
                    'rounded-lg p-3',
                    chatbot.isActive ? 'bg-green-500/20' : 'bg-gray-800',
                  )}
                >
                  <Bot
                    className={cn('h-6 w-6', chatbot.isActive ? 'text-green-400' : 'text-gray-400')}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-white">{chatbot.name}</h3>
                  {chatbot.description && (
                    <p className="mt-0.5 text-sm text-gray-400 truncate">{chatbot.description}</p>
                  )}
                </div>
              </div>

              {/* Status */}
              <div className="mt-4 flex items-center gap-3">
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                    chatbot.isActive
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-gray-500/20 text-gray-400',
                  )}
                >
                  <div
                    className={cn(
                      'h-1.5 w-1.5 rounded-full',
                      chatbot.isActive ? 'bg-green-400' : 'bg-gray-400',
                    )}
                  />
                  {chatbot.isActive ? 'Ativo' : 'Inativo'}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-400">
                  <Zap className="h-3 w-3" />
                  {triggerTypeLabels[chatbot.triggerType]}
                </span>
              </div>

              {/* Info */}
              <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  {chatbot.channel ? (
                    <>
                      <MessageSquare className="h-3 w-3" />
                      {chatbot.channel.name}
                    </>
                  ) : (
                    'Nenhum canal'
                  )}
                </span>
                <span>{formatDate(chatbot.createdAt)}</span>
              </div>

              {/* Keywords */}
              {chatbot.triggerType === 'keyword' &&
                (chatbot.triggerConfig?.keywords as string[])?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {((chatbot.triggerConfig?.keywords as string[]) || []).slice(0, 3).map((kw) => (
                      <span
                        key={kw}
                        className="inline-flex items-center rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-400"
                      >
                        {kw}
                      </span>
                    ))}
                    {((chatbot.triggerConfig?.keywords as string[]) || []).length > 3 && (
                      <span className="text-xs text-gray-500">
                        +{(chatbot.triggerConfig?.keywords as string[]).length - 3}
                      </span>
                    )}
                  </div>
                )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-lg border border-gray-800 bg-gray-900 p-6 max-h-[90vh] overflow-y-auto">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                {editingChatbot ? 'Editar Chatbot' : 'Novo Chatbot'}
              </h3>
              <button
                type="button"
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label
                  htmlFor="chatbot-name"
                  className="mb-2 block text-sm font-medium text-gray-300"
                >
                  Nome *
                </label>
                <input
                  id="chatbot-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Atendimento Inicial"
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:border-v4-red-500 focus:outline-none"
                />
              </div>

              {/* Description */}
              <div>
                <label
                  htmlFor="chatbot-desc"
                  className="mb-2 block text-sm font-medium text-gray-300"
                >
                  Descrição
                </label>
                <textarea
                  id="chatbot-desc"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descreva o objetivo deste chatbot..."
                  rows={2}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:border-v4-red-500 focus:outline-none resize-none"
                />
              </div>

              {/* Channel */}
              <div>
                <label
                  htmlFor="chatbot-channel"
                  className="mb-2 block text-sm font-medium text-gray-300"
                >
                  Canal (opcional)
                </label>
                {loadingChannels ? (
                  <div className="flex items-center gap-2 text-gray-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando canais...
                  </div>
                ) : (
                  <select
                    id="chatbot-channel"
                    value={formData.channelId}
                    onChange={(e) => setFormData({ ...formData, channelId: e.target.value })}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white focus:border-v4-red-500 focus:outline-none"
                  >
                    <option value="">Todos os canais</option>
                    {channels.map((channel) => (
                      <option key={channel.id} value={channel.id}>
                        {channel.name} ({channel.type})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Trigger Type */}
              <fieldset className="border-0 p-0 m-0">
                <legend className="mb-2 block text-sm font-medium text-gray-300">
                  Tipo de Gatilho
                </legend>
                <div className="grid grid-cols-3 gap-2">
                  {(['keyword', 'always'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData({ ...formData, triggerType: type })}
                      className={cn(
                        'rounded-lg border px-3 py-2 text-sm transition',
                        formData.triggerType === type
                          ? 'border-v4-red-500 bg-v4-red-500/20 text-white'
                          : 'border-gray-700 bg-gray-800 text-gray-400 hover:text-white',
                      )}
                    >
                      {triggerTypeLabels[type]}
                    </button>
                  ))}
                </div>
              </fieldset>

              {/* Keywords */}
              {formData.triggerType === 'keyword' && (
                <div>
                  <label
                    htmlFor="chatbot-keyword"
                    className="mb-2 block text-sm font-medium text-gray-300"
                  >
                    Palavras-chave
                  </label>
                  {formData.keywords.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-2">
                      {formData.keywords.map((keyword) => (
                        <span
                          key={keyword}
                          className="inline-flex items-center gap-1 rounded-full bg-gray-800 px-2 py-1 text-xs text-gray-300"
                        >
                          {keyword}
                          <button
                            type="button"
                            onClick={() => handleRemoveKeyword(keyword)}
                            className="ml-1 text-gray-500 hover:text-white"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      id="chatbot-keyword"
                      type="text"
                      value={keywordInput}
                      onChange={(e) => setKeywordInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddKeyword();
                        }
                      }}
                      placeholder="Digite uma palavra-chave..."
                      className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:border-v4-red-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddKeyword}
                      disabled={!keywordInput.trim()}
                      className="rounded-lg border border-gray-700 px-3 py-2 text-gray-400 hover:bg-gray-800 hover:text-white disabled:opacity-50"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {formError && <p className="text-sm text-red-400">{formError}</p>}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 rounded-lg border border-gray-700 py-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 rounded-lg bg-v4-red-500 py-2 font-medium text-white transition-colors hover:bg-v4-red-600 disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  ) : editingChatbot ? (
                    'Salvar'
                  ) : (
                    'Criar Chatbot'
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
