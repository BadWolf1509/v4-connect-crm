'use client';

import { useApi } from '@/hooks/use-api';
import { cn } from '@/lib/utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit2, Loader2, MessageSquare, Plus, Trash2, X, Zap } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface QuickReply {
  id: string;
  title: string;
  content: string;
  shortcut?: string;
  category?: string;
}

const AVAILABLE_VARIABLES = [
  { key: 'nome', label: 'Nome do contato', category: 'Contato' },
  { key: 'email', label: 'E-mail do contato', category: 'Contato' },
  { key: 'telefone', label: 'Telefone do contato', category: 'Contato' },
  { key: 'empresa', label: 'Empresa do contato', category: 'Contato' },
  { key: 'agente_nome', label: 'Nome do agente', category: 'Agente' },
  { key: 'agente_email', label: 'E-mail do agente', category: 'Agente' },
  { key: 'data', label: 'Data atual', category: 'Sistema' },
  { key: 'hora', label: 'Hora atual', category: 'Sistema' },
  { key: 'dia_semana', label: 'Dia da semana', category: 'Sistema' },
];

const CATEGORIES = ['Geral', 'Vendas', 'Suporte', 'Atendimento', 'Informações'];

export default function QuickRepliesSettingsPage() {
  const { api } = useApi();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReply, setEditingReply] = useState<QuickReply | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [shortcut, setShortcut] = useState('');
  const [category, setCategory] = useState('Geral');

  // Fetch quick replies
  const { data, isLoading } = useQuery({
    queryKey: ['quick-replies'],
    queryFn: () => api.get<{ quickReplies: QuickReply[] }>('/quick-replies'),
  });

  const quickReplies = data?.quickReplies || [];

  const filteredReplies = selectedCategory
    ? quickReplies.filter((r) => r.category === selectedCategory)
    : quickReplies;

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: Omit<QuickReply, 'id'>) => api.post('/quick-replies', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick-replies'] });
      toast.success('Resposta rápida criada');
      closeModal();
    },
    onError: () => {
      toast.error('Erro ao criar resposta rápida');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: QuickReply) => api.patch(`/quick-replies/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick-replies'] });
      toast.success('Resposta rápida atualizada');
      closeModal();
    },
    onError: () => {
      toast.error('Erro ao atualizar resposta rápida');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/quick-replies/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick-replies'] });
      toast.success('Resposta rápida excluída');
    },
    onError: () => {
      toast.error('Erro ao excluir resposta rápida');
    },
  });

  const openModal = (reply?: QuickReply) => {
    if (reply) {
      setEditingReply(reply);
      setTitle(reply.title);
      setContent(reply.content);
      setShortcut(reply.shortcut || '');
      setCategory(reply.category || 'Geral');
    } else {
      setEditingReply(null);
      setTitle('');
      setContent('');
      setShortcut('');
      setCategory('Geral');
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingReply(null);
    setTitle('');
    setContent('');
    setShortcut('');
    setCategory('Geral');
  };

  const handleSubmit = () => {
    if (!title.trim() || !content.trim()) {
      toast.error('Preencha título e conteúdo');
      return;
    }

    const data = {
      title: title.trim(),
      content: content.trim(),
      shortcut: shortcut.trim() || undefined,
      category,
    };

    if (editingReply) {
      updateMutation.mutate({ id: editingReply.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const insertVariable = (variable: string) => {
    setContent((prev) => `${prev}{{${variable}}}`);
  };

  // Highlight variables in content
  const renderContentPreview = (text: string) => {
    const parts = text.split(/(\{\{\w+\}\})/g);
    const occurrences = new Map<string, number>();

    return parts.map((part) => {
      const occurrence = occurrences.get(part) ?? 0;
      occurrences.set(part, occurrence + 1);
      const key = `${part}-${occurrence}`;

      if (/^\{\{\w+\}\}$/.test(part)) {
        return (
          <span key={key} className="text-v4-red-400 font-medium">
            {part}
          </span>
        );
      }
      return <span key={key}>{part}</span>;
    });
  };

  const categories = Array.from(
    new Set(quickReplies.map((r) => r.category).filter(Boolean)),
  ) as string[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>Respostas Rápidas</h1>
          <p className="text-sm text-gray-400 mt-1">
            Gerencie suas respostas rápidas com suporte a variáveis dinâmicas
          </p>
        </div>
        <button
          type="button"
          onClick={() => openModal()}
          className="flex items-center gap-2 rounded-lg bg-v4-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-v4-red-600"
        >
          <Plus className="h-4 w-4" />
          Nova Resposta
        </button>
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSelectedCategory(null)}
          className={cn(
            'rounded-full px-3 py-1.5 text-sm font-medium transition',
            !selectedCategory
              ? 'bg-v4-red-500 text-white'
              : 'bg-gray-800 text-gray-400 hover:text-white',
          )}
        >
          Todas ({quickReplies.length})
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={cn(
              'rounded-full px-3 py-1.5 text-sm font-medium transition',
              selectedCategory === cat
                ? 'bg-v4-red-500 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white',
            )}
          >
            {cat} ({quickReplies.filter((r) => r.category === cat).length})
          </button>
        ))}
      </div>

      {/* Quick Replies List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : filteredReplies.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-white mb-2">Nenhuma resposta rápida</h3>
          <p className="mb-4">Crie respostas para agilizar seu atendimento</p>
          <button
            type="button"
            onClick={() => openModal()}
            className="inline-flex items-center gap-2 rounded-lg bg-v4-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-v4-red-600"
          >
            <Plus className="h-4 w-4" />
            Criar primeira resposta
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredReplies.map((reply) => (
            <div
              key={reply.id}
              className="rounded-xl border border-gray-800 bg-gray-900 p-4 hover:border-gray-700 transition"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-v4-red-500" />
                  <h3 className="font-medium text-white">{reply.title}</h3>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openModal(reply)}
                    className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Deseja excluir esta resposta rápida?')) {
                        deleteMutation.mutate(reply.id);
                      }
                    }}
                    className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <p className="text-sm text-gray-400 mb-3 line-clamp-3">
                {renderContentPreview(reply.content)}
              </p>

              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 bg-gray-800 px-2 py-1 rounded">
                  {reply.category}
                </span>
                {reply.shortcut && (
                  <span className="text-gray-500 bg-gray-800 px-2 py-1 rounded font-mono">
                    {reply.shortcut}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-2xl rounded-xl border border-gray-800 bg-gray-900 shadow-xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-800 p-4">
              <h2 className="text-lg font-semibold text-white">
                {editingReply ? 'Editar Resposta' : 'Nova Resposta Rápida'}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-4">
              {/* Title */}
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-400 mb-1">
                  Título *
                </label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Saudação inicial"
                  className="w-full rounded-lg border border-gray-800 bg-gray-950 px-4 py-2 text-white placeholder-gray-500 focus:border-v4-red-500 focus:outline-none"
                />
              </div>

              {/* Content */}
              <div>
                <label htmlFor="content" className="block text-sm font-medium text-gray-400 mb-1">
                  Conteúdo *
                </label>
                <textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Digite o conteúdo da resposta..."
                  rows={4}
                  className="w-full rounded-lg border border-gray-800 bg-gray-950 px-4 py-2 text-white placeholder-gray-500 focus:border-v4-red-500 focus:outline-none resize-none"
                />
              </div>

              {/* Variables */}
              <div>
                <p className="block text-sm font-medium text-gray-400 mb-2">Inserir Variável</p>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_VARIABLES.map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => insertVariable(v.key)}
                      className="rounded-lg bg-gray-800 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700 hover:text-white transition"
                      title={v.label}
                    >
                      {`{{${v.key}}}`}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Clique para inserir a variável no conteúdo
                </p>
              </div>

              {/* Shortcut & Category */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="shortcut"
                    className="block text-sm font-medium text-gray-400 mb-1"
                  >
                    Atalho
                  </label>
                  <input
                    id="shortcut"
                    type="text"
                    value={shortcut}
                    onChange={(e) => setShortcut(e.target.value)}
                    placeholder="Ex: /ola"
                    className="w-full rounded-lg border border-gray-800 bg-gray-950 px-4 py-2 text-white placeholder-gray-500 focus:border-v4-red-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="category"
                    className="block text-sm font-medium text-gray-400 mb-1"
                  >
                    Categoria
                  </label>
                  <select
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-lg border border-gray-800 bg-gray-950 px-4 py-2 text-white focus:border-v4-red-500 focus:outline-none"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Preview */}
              {content && (
                <div className="rounded-lg border border-gray-800 bg-gray-950 p-4">
                  <div className="text-xs text-gray-500 mb-2">Preview</div>
                  <p className="text-sm text-white">{renderContentPreview(content)}</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-gray-800 p-4">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg px-4 py-2 text-sm text-gray-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="flex items-center gap-2 rounded-lg bg-v4-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-v4-red-600 disabled:opacity-50"
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {editingReply ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
