import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

export interface Message {
  id: string;
  conversationId: string;
  type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'location' | 'sticker';
  content: string | null;
  mediaUrl: string | null;
  sender: 'user' | 'contact' | 'system';
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  createdAt: string;
  user?: {
    id: string;
    name: string;
  } | null;
}

interface MessagesResponse {
  messages: Message[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface SendMessageData {
  conversationId: string;
  type: 'text' | 'image' | 'audio' | 'video' | 'document';
  content?: string;
  mediaUrl?: string;
}

export function useMessages(conversationId: string, page = 1, limit = 50) {
  return useQuery({
    queryKey: ['messages', conversationId, page],
    queryFn: () =>
      api.get<MessagesResponse>(`/conversations/${conversationId}/messages`, {
        params: { page, limit },
      }),
    enabled: !!conversationId,
    staleTime: 10 * 1000, // 10 seconds
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SendMessageData) => api.post<Message>('/messages', data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['messages', variables.conversationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['conversations'],
      });
    },
  });
}
