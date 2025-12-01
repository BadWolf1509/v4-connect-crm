import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from './use-api';

interface Tag {
  id: string;
  name: string;
  color: string;
  description?: string;
  contactCount?: number;
}

export function useTags() {
  const { api, isAuthenticated } = useApi();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['tags'],
    queryFn: () => api.get<{ tags: Tag[] }>('/tags'),
    enabled: isAuthenticated,
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; color?: string; description?: string }) =>
      api.post<Tag>('/tags', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: { id: string; data: { name?: string; color?: string; description?: string } }) =>
      api.patch<Tag>(`/tags/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/tags/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });

  return {
    tags: data?.tags || [],
    isLoading,
    error,
    createTag: createMutation.mutateAsync,
    updateTag: updateMutation.mutateAsync,
    deleteTag: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

export function useContactTags(contactId: string | null) {
  const { api, isAuthenticated } = useApi();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['contact-tags', contactId],
    queryFn: () => api.get<Tag[]>(`/contacts/${contactId}/tags`),
    enabled: isAuthenticated && !!contactId,
  });

  const setTagsMutation = useMutation({
    mutationFn: (tagIds: string[]) => api.put(`/contacts/${contactId}/tags`, { tagIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-tags', contactId] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });

  const addTagMutation = useMutation({
    mutationFn: (tagId: string) => api.post(`/contacts/${contactId}/tags/${tagId}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-tags', contactId] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });

  const removeTagMutation = useMutation({
    mutationFn: (tagId: string) => api.delete(`/contacts/${contactId}/tags/${tagId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-tags', contactId] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });

  return {
    contactTags: data || [],
    isLoading,
    setTags: setTagsMutation.mutateAsync,
    addTag: addTagMutation.mutateAsync,
    removeTag: removeTagMutation.mutateAsync,
    isSaving: setTagsMutation.isPending || addTagMutation.isPending || removeTagMutation.isPending,
  };
}
