'use client';

import { useApi } from '@/hooks/use-api';
import { cn } from '@/lib/utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  GitMerge,
  Loader2,
  Mail,
  Phone,
  X,
} from 'lucide-react';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

interface DuplicateContact {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  avatarUrl: string | null;
  tags: string[];
  createdAt: Date;
}

interface DuplicateGroup {
  contact: DuplicateContact;
  duplicates: DuplicateContact[];
  matchType: 'phone' | 'email' | 'both';
}

interface MergeModalProps {
  open: boolean;
  onClose: () => void;
}

export function MergeModal({ open, onClose }: MergeModalProps) {
  const { api, isAuthenticated } = useApi();
  const queryClient = useQueryClient();
  const [selectedGroup, setSelectedGroup] = useState<DuplicateGroup | null>(null);
  const [primaryId, setPrimaryId] = useState<string | null>(null);
  const [mergeOptions, setMergeOptions] = useState({
    keepPrimaryName: true,
    keepPrimaryPhone: true,
    keepPrimaryEmail: true,
    mergeTags: true,
  });

  // Fetch duplicates
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['contacts-duplicates'],
    queryFn: () => api.get<{ duplicates: DuplicateGroup[] }>('/contacts/duplicates'),
    enabled: isAuthenticated && open,
  });

  const duplicates = data?.duplicates || [];

  // Merge mutation
  const mergeMutation = useMutation({
    mutationFn: (params: { primaryId: string; secondaryIds: string[] }) =>
      api.post('/contacts/merge', {
        ...params,
        options: mergeOptions,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contacts-duplicates'] });
      toast.success('Contatos mesclados com sucesso');
      setSelectedGroup(null);
      setPrimaryId(null);
      refetch();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao mesclar contatos');
    },
  });

  const handleSelectGroup = useCallback((group: DuplicateGroup) => {
    setSelectedGroup(group);
    setPrimaryId(group.contact.id);
  }, []);

  const handleMerge = useCallback(() => {
    if (!selectedGroup || !primaryId) return;

    const allContacts = [selectedGroup.contact, ...selectedGroup.duplicates];
    const secondaryIds = allContacts.filter((c) => c.id !== primaryId).map((c) => c.id);

    mergeMutation.mutate({
      primaryId,
      secondaryIds,
    });
  }, [selectedGroup, primaryId, mergeMutation]);

  const handleClose = useCallback(() => {
    setSelectedGroup(null);
    setPrimaryId(null);
    onClose();
  }, [onClose]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const matchTypeLabel: Record<string, string> = {
    phone: 'Mesmo telefone',
    email: 'Mesmo email',
    both: 'Mesmo telefone e email',
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-3xl rounded-xl border border-gray-800 bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 p-4">
          <div className="flex items-center gap-3">
            <GitMerge className="h-5 w-5 text-v4-red-500" />
            <h2 className="text-lg font-semibold text-white">Mesclar Contatos Duplicados</h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[70vh] overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-v4-red-500" />
            </div>
          ) : !selectedGroup ? (
            // List of duplicate groups
            <div className="space-y-4">
              {duplicates.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
                  <h3 className="mt-4 text-lg font-medium text-white">
                    Nenhum duplicado encontrado
                  </h3>
                  <p className="mt-2 text-sm text-gray-400">
                    Todos os seus contatos parecem ser únicos
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-400">
                    Encontramos <span className="font-medium text-white">{duplicates.length}</span>{' '}
                    possíveis duplicados. Clique em um grupo para revisar e mesclar.
                  </p>

                  {duplicates.map((group, index) => (
                    <button
                      key={`${group.contact.id}-${index}`}
                      type="button"
                      onClick={() => handleSelectGroup(group)}
                      className="w-full rounded-lg border border-gray-700 bg-gray-800/50 p-4 text-left transition hover:bg-gray-800"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex -space-x-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-700 ring-2 ring-gray-900">
                              <span className="text-sm font-medium text-white">
                                {getInitials(group.contact.name)}
                              </span>
                            </div>
                            {group.duplicates.slice(0, 2).map((dup) => (
                              <div
                                key={dup.id}
                                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-600 ring-2 ring-gray-900"
                              >
                                <span className="text-sm font-medium text-white">
                                  {getInitials(dup.name)}
                                </span>
                              </div>
                            ))}
                          </div>
                          <div>
                            <div className="font-medium text-white">
                              {group.contact.name}
                              {group.duplicates.length > 0 && (
                                <span className="text-gray-400">
                                  {' '}
                                  e {group.duplicates.length} outro
                                  {group.duplicates.length > 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-400">
                              {group.contact.phone || group.contact.email}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-yellow-500/10 px-2 py-1 text-xs font-medium text-yellow-500">
                            {matchTypeLabel[group.matchType]}
                          </span>
                          <ArrowRight className="h-4 w-4 text-gray-500" />
                        </div>
                      </div>
                    </button>
                  ))}
                </>
              )}
            </div>
          ) : (
            // Selected group - merge options
            <div className="space-y-6">
              <button
                type="button"
                onClick={() => {
                  setSelectedGroup(null);
                  setPrimaryId(null);
                }}
                className="text-sm text-gray-400 hover:text-white"
              >
                ← Voltar
              </button>

              <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 text-yellow-500" />
                  <div>
                    <div className="font-medium text-yellow-500">Atenção</div>
                    <div className="mt-1 text-sm text-yellow-400/80">
                      Os contatos secundários serão excluídos após a mesclagem. Esta ação não pode
                      ser desfeita.
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-medium text-gray-300">
                  Selecione o contato principal:
                </h3>
                <div className="space-y-2">
                  {[selectedGroup.contact, ...selectedGroup.duplicates].map((contact) => (
                    <button
                      key={contact.id}
                      type="button"
                      onClick={() => setPrimaryId(contact.id)}
                      className={cn(
                        'w-full rounded-lg border p-4 text-left transition',
                        primaryId === contact.id
                          ? 'border-v4-red-500 bg-v4-red-500/10'
                          : 'border-gray-700 bg-gray-800/50 hover:bg-gray-800',
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-700">
                          <span className="text-lg font-medium text-white">
                            {getInitials(contact.name)}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white">{contact.name}</span>
                            {primaryId === contact.id && (
                              <span className="rounded bg-v4-red-500/20 px-2 py-0.5 text-xs font-medium text-v4-red-500">
                                Principal
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex items-center gap-4 text-sm text-gray-400">
                            {contact.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3.5 w-3.5" />
                                {contact.phone}
                              </span>
                            )}
                            {contact.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="h-3.5 w-3.5" />
                                {contact.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-medium text-gray-300">Opções de mesclagem:</h3>
                <div className="space-y-3 rounded-lg border border-gray-700 bg-gray-800/50 p-4">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={mergeOptions.keepPrimaryName}
                      onChange={(e) =>
                        setMergeOptions({ ...mergeOptions, keepPrimaryName: e.target.checked })
                      }
                      className="rounded border-gray-600 bg-gray-700 text-v4-red-500 focus:ring-v4-red-500"
                    />
                    <span className="text-sm text-gray-300">Manter nome do contato principal</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={mergeOptions.keepPrimaryPhone}
                      onChange={(e) =>
                        setMergeOptions({ ...mergeOptions, keepPrimaryPhone: e.target.checked })
                      }
                      className="rounded border-gray-600 bg-gray-700 text-v4-red-500 focus:ring-v4-red-500"
                    />
                    <span className="text-sm text-gray-300">
                      Manter telefone do contato principal
                    </span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={mergeOptions.keepPrimaryEmail}
                      onChange={(e) =>
                        setMergeOptions({ ...mergeOptions, keepPrimaryEmail: e.target.checked })
                      }
                      className="rounded border-gray-600 bg-gray-700 text-v4-red-500 focus:ring-v4-red-500"
                    />
                    <span className="text-sm text-gray-300">Manter email do contato principal</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={mergeOptions.mergeTags}
                      onChange={(e) =>
                        setMergeOptions({ ...mergeOptions, mergeTags: e.target.checked })
                      }
                      className="rounded border-gray-600 bg-gray-700 text-v4-red-500 focus:ring-v4-red-500"
                    />
                    <span className="text-sm text-gray-300">Mesclar tags de todos os contatos</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-gray-800 p-4">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-400 hover:text-white"
          >
            {selectedGroup ? 'Cancelar' : 'Fechar'}
          </button>
          {selectedGroup && (
            <button
              type="button"
              onClick={handleMerge}
              disabled={!primaryId || mergeMutation.isPending}
              className="flex items-center gap-2 rounded-lg bg-v4-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-v4-red-600 disabled:opacity-50"
            >
              {mergeMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              <GitMerge className="h-4 w-4" />
              Mesclar Contatos
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
