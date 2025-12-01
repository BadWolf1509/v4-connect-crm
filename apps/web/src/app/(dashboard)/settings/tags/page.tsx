'use client';

import { useApi } from '@/hooks/use-api';
import { cn } from '@/lib/utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit2, Loader2, MoreVertical, Plus, Tag, Trash2, Users, X } from 'lucide-react';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

interface TagData {
  id: string;
  name: string;
  color: string;
  description?: string;
  contactCount: number;
  createdAt: string;
}

const PRESET_COLORS = [
  '#EF4444', // red
  '#F97316', // orange
  '#EAB308', // yellow
  '#22C55E', // green
  '#14B8A6', // teal
  '#3B82F6', // blue
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#6B7280', // gray
];

export default function TagsSettingsPage() {
  const { api, isAuthenticated } = useApi();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingTag, setEditingTag] = useState<TagData | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6B7280');
  const [description, setDescription] = useState('');

  // Fetch tags
  const { data: tagsData, isLoading } = useQuery({
    queryKey: ['tags'],
    queryFn: () => api.get<{ tags: TagData[] }>('/tags'),
    enabled: isAuthenticated,
  });

  const tags = tagsData?.tags || [];

  // Create tag mutation
  const createMutation = useMutation({
    mutationFn: (data: { name: string; color: string; description?: string }) =>
      api.post('/tags', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      toast.success('Tag criada com sucesso');
      closeModal();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao criar tag');
    },
  });

  // Update tag mutation
  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: { id: string; data: { name?: string; color?: string; description?: string } }) =>
      api.patch(`/tags/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      toast.success('Tag atualizada');
      closeModal();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao atualizar tag');
    },
  });

  // Delete tag mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/tags/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      toast.success('Tag excluída');
    },
    onError: () => {
      toast.error('Erro ao excluir tag');
    },
  });

  const openCreateModal = useCallback(() => {
    setEditingTag(null);
    setName('');
    setColor('#6B7280');
    setDescription('');
    setShowModal(true);
  }, []);

  const openEditModal = useCallback((tag: TagData) => {
    setEditingTag(tag);
    setName(tag.name);
    setColor(tag.color);
    setDescription(tag.description || '');
    setShowModal(true);
    setMenuOpen(null);
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setEditingTag(null);
    setName('');
    setColor('#6B7280');
    setDescription('');
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (!name.trim()) {
        toast.error('Nome é obrigatório');
        return;
      }

      if (editingTag) {
        updateMutation.mutate({
          id: editingTag.id,
          data: { name, color, description: description || undefined },
        });
      } else {
        createMutation.mutate({ name, color, description: description || undefined });
      }
    },
    [name, color, description, editingTag, createMutation, updateMutation],
  );

  const handleDelete = useCallback(
    (tag: TagData) => {
      if (
        confirm(
          `Deseja excluir a tag "${tag.name}"? Esta a��o remover� a tag de todos os contatos.`,
        )
      ) {
        deleteMutation.mutate(tag.id);
      }
      setMenuOpen(null);
    },
    [deleteMutation],
  );

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-v4-red-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Tags</h1>
        <p className="mt-1 text-sm text-gray-400">
          Gerencie as tags para segmentar e organizar seus contatos
        </p>
      </div>

      {/* Tags Section */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/50">
        <div className="flex items-center justify-between border-b border-gray-800 p-4">
          <div className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-gray-400" />
            <h2 className="font-semibold text-white">Tags ({tags.length})</h2>
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center gap-2 rounded-lg bg-v4-red-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-v4-red-600"
          >
            <Plus className="h-4 w-4" />
            Nova Tag
          </button>
        </div>

        {tags.length > 0 ? (
          <div className="divide-y divide-gray-800">
            {tags.map((tag) => (
              <div
                key={tag.id}
                className="flex items-center justify-between p-4 hover:bg-gray-800/50"
              >
                <div className="flex items-center gap-4">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${tag.color}20` }}
                  >
                    <Tag className="h-5 w-5" style={{ color: tag.color }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium"
                        style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                      >
                        {tag.name}
                      </span>
                    </div>
                    {tag.description && (
                      <div className="mt-1 text-sm text-gray-400">{tag.description}</div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-sm text-gray-400">
                    <Users className="h-4 w-4" />
                    {tag.contactCount} {tag.contactCount === 1 ? 'contato' : 'contatos'}
                  </div>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setMenuOpen(menuOpen === tag.id ? null : tag.id)}
                      className="rounded-lg p-2 text-gray-400 hover:bg-gray-700 hover:text-white"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>

                    {menuOpen === tag.id && (
                      <div className="absolute right-0 top-full z-10 mt-1 w-40 rounded-lg border border-gray-700 bg-gray-800 py-1 shadow-xl">
                        <button
                          type="button"
                          onClick={() => openEditModal(tag)}
                          className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
                        >
                          <Edit2 className="h-4 w-4" />
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(tag)}
                          className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-gray-700"
                        >
                          <Trash2 className="h-4 w-4" />
                          Excluir
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <Tag className="mx-auto h-12 w-12 text-gray-600" />
            <h3 className="mt-4 text-lg font-medium text-white">Nenhuma tag criada</h3>
            <p className="mt-2 text-sm text-gray-400">
              Crie tags para organizar e segmentar seus contatos
            </p>
            <button
              type="button"
              onClick={openCreateModal}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-v4-red-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-v4-red-600"
            >
              <Plus className="h-4 w-4" />
              Criar primeira tag
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl border border-gray-800 bg-gray-900 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                {editingTag ? 'Editar Tag' : 'Nova Tag'}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="tag-name" className="block text-sm font-medium text-gray-300">
                  Nome
                </label>
                <input
                  id="tag-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={50}
                  placeholder="Ex: Cliente VIP, Lead quente..."
                  className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:border-v4-red-500 focus:outline-none"
                />
              </div>

              <div>
                <p className="block text-sm font-medium text-gray-300">Cor</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={cn(
                        'h-8 w-8 rounded-lg transition',
                        color === c && 'ring-2 ring-white ring-offset-2 ring-offset-gray-900',
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label
                  htmlFor="tag-description"
                  className="block text-sm font-medium text-gray-300"
                >
                  Descrição (opcional)
                </label>
                <textarea
                  id="tag-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={200}
                  rows={2}
                  placeholder="Descreva o uso desta tag..."
                  className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:border-v4-red-500 focus:outline-none"
                />
              </div>

              {/* Preview */}
              <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-3">
                <div className="text-xs text-gray-400">Preview</div>
                <div className="mt-2">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium"
                    style={{ backgroundColor: `${color}20`, color: color }}
                  >
                    <Tag className="h-3.5 w-3.5" />
                    {name || 'Nome da tag'}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-gray-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex items-center gap-2 rounded-lg bg-v4-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-v4-red-600 disabled:opacity-50"
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {editingTag ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
