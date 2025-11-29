'use client';

import { type Conversation, type Message, apiClient } from '@/lib/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

interface ConversationsResponse {
  conversations: Conversation[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface MessagesResponse {
  messages: Message[];
  nextCursor: string | null;
  hasMore: boolean;
}

interface ConversationFilters {
  page?: number;
  limit?: number;
  status?: 'pending' | 'open' | 'resolved' | 'snoozed';
  inboxId?: string;
  assigneeId?: string;
  channelId?: string;
}

export function useConversations(filters: ConversationFilters = {}) {
  return useQuery({
    queryKey: ['conversations', filters],
    queryFn: () =>
      apiClient.get<ConversationsResponse>('/conversations', {
        params: {
          page: filters.page,
          limit: filters.limit,
          status: filters.status,
          inboxId: filters.inboxId,
          assigneeId: filters.assigneeId,
          channelId: filters.channelId,
        },
      }),
  });
}

export function useConversation(id: string) {
  return useQuery({
    queryKey: ['conversations', id],
    queryFn: () => apiClient.get<Conversation>(`/conversations/${id}`),
    enabled: !!id,
  });
}

export function useConversationMessages(conversationId: string, cursor?: string) {
  return useQuery({
    queryKey: ['messages', conversationId, cursor],
    queryFn: () =>
      apiClient.get<MessagesResponse>(`/messages/conversation/${conversationId}`, {
        params: { cursor, limit: 50 },
      }),
    enabled: !!conversationId,
  });
}

export function useAssignConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, userId }: { id: string; userId: string }) =>
      apiClient.patch(`/conversations/${id}/assign`, { userId }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversations', id] });
    },
  });
}

export function useUnassignConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.post(`/conversations/${id}/unassign`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversations', id] });
    },
  });
}

export function useResolveConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.post(`/conversations/${id}/resolve`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversations', id] });
    },
  });
}

export function useReopenConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.post(`/conversations/${id}/reopen`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversations', id] });
    },
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      conversationId: string;
      type: 'text' | 'image' | 'video' | 'audio' | 'document';
      content?: string;
      mediaUrl?: string;
    }) => apiClient.post<Message>('/messages', data),
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}
