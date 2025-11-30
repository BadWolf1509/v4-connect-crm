import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

export interface Conversation {
  id: string;
  contactId: string;
  channelId: string;
  status: 'open' | 'pending' | 'resolved' | 'closed';
  unreadCount: number;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  createdAt: string;
  contact: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    avatarUrl: string | null;
  } | null;
  channel: {
    id: string;
    name: string;
    type: 'whatsapp' | 'instagram' | 'messenger' | 'webchat';
  } | null;
}

interface ConversationsResponse {
  conversations: Conversation[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface ConversationFilters {
  status?: string;
  channelId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export function useConversations(filters: ConversationFilters = {}) {
  return useQuery({
    queryKey: ['conversations', filters],
    queryFn: () =>
      api.get<ConversationsResponse>('/conversations', {
        params: {
          status: filters.status,
          channelId: filters.channelId,
          search: filters.search,
          page: filters.page || 1,
          limit: filters.limit || 50,
        },
      }),
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useConversation(id: string) {
  return useQuery({
    queryKey: ['conversation', id],
    queryFn: () => api.get<Conversation>(`/conversations/${id}`),
    enabled: !!id,
  });
}

export function useUpdateConversationStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/conversations/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}
