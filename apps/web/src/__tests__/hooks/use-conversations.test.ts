import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock apiClient
const mockApiClient = {
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
};

vi.mock('@/lib/api-client', () => ({
  apiClient: mockApiClient,
}));

// Import hooks after mocking
import {
  useAssignConversation,
  useConversation,
  useConversationMessages,
  useConversations,
  useReopenConversation,
  useResolveConversation,
  useSendMessage,
  useUnassignConversation,
} from '@/hooks/use-conversations';

// Test wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const mockConversation = {
  id: 'conv-123',
  status: 'open' as const,
  contact: {
    id: 'contact-123',
    name: 'John Doe',
    phone: '+5511999999999',
    email: 'john@example.com',
    avatarUrl: null,
  },
  channel: {
    id: 'channel-123',
    type: 'whatsapp',
    name: 'WhatsApp Principal',
  },
  assignee: {
    id: 'user-123',
    name: 'Agent',
    email: 'agent@example.com',
  },
  lastMessageAt: '2024-01-01T12:00:00Z',
  createdAt: '2024-01-01T00:00:00Z',
};

const mockConversationsResponse = {
  conversations: [mockConversation],
  pagination: {
    page: 1,
    limit: 20,
    total: 1,
    totalPages: 1,
  },
};

const mockMessage = {
  id: 'msg-123',
  conversationId: 'conv-123',
  type: 'text' as const,
  content: 'Hello!',
  senderId: 'user-123',
  senderType: 'user' as const,
  status: 'sent' as const,
  createdAt: '2024-01-01T12:00:00Z',
};

const mockMessagesResponse = {
  messages: [mockMessage],
  nextCursor: null,
  hasMore: false,
};

describe('useConversations hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useConversations', () => {
    it('should fetch conversations with default filters', async () => {
      mockApiClient.get.mockResolvedValueOnce(mockConversationsResponse);

      const { result } = renderHook(() => useConversations(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockApiClient.get).toHaveBeenCalledWith('/conversations', {
        params: expect.objectContaining({}),
      });
      expect(result.current.data).toEqual(mockConversationsResponse);
    });

    it('should fetch conversations with filters', async () => {
      mockApiClient.get.mockResolvedValueOnce(mockConversationsResponse);

      const { result } = renderHook(
        () =>
          useConversations({
            status: 'open',
            inboxId: 'inbox-123',
            assigneeId: 'user-123',
            channelId: 'channel-123',
            page: 2,
            limit: 10,
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockApiClient.get).toHaveBeenCalledWith('/conversations', {
        params: {
          status: 'open',
          inboxId: 'inbox-123',
          assigneeId: 'user-123',
          channelId: 'channel-123',
          page: 2,
          limit: 10,
        },
      });
    });
  });

  describe('useConversation', () => {
    it('should fetch single conversation by id', async () => {
      mockApiClient.get.mockResolvedValueOnce(mockConversation);

      const { result } = renderHook(() => useConversation('conv-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockApiClient.get).toHaveBeenCalledWith('/conversations/conv-123');
      expect(result.current.data).toEqual(mockConversation);
    });

    it('should not fetch when id is empty', () => {
      const { result } = renderHook(() => useConversation(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
    });
  });

  describe('useConversationMessages', () => {
    it('should fetch messages for conversation', async () => {
      mockApiClient.get.mockResolvedValueOnce(mockMessagesResponse);

      const { result } = renderHook(() => useConversationMessages('conv-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockApiClient.get).toHaveBeenCalledWith('/messages/conversation/conv-123', {
        params: { cursor: undefined, limit: 50 },
      });
    });

    it('should fetch messages with cursor', async () => {
      mockApiClient.get.mockResolvedValueOnce(mockMessagesResponse);

      const { result } = renderHook(
        () => useConversationMessages('conv-123', 'cursor-abc'),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockApiClient.get).toHaveBeenCalledWith('/messages/conversation/conv-123', {
        params: { cursor: 'cursor-abc', limit: 50 },
      });
    });
  });

  describe('useAssignConversation', () => {
    it('should assign conversation to user', async () => {
      mockApiClient.patch.mockResolvedValueOnce({ success: true });

      const { result } = renderHook(() => useAssignConversation(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ id: 'conv-123', userId: 'user-456' });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockApiClient.patch).toHaveBeenCalledWith('/conversations/conv-123/assign', {
        userId: 'user-456',
      });
    });
  });

  describe('useUnassignConversation', () => {
    it('should unassign conversation', async () => {
      mockApiClient.post.mockResolvedValueOnce({ success: true });

      const { result } = renderHook(() => useUnassignConversation(), {
        wrapper: createWrapper(),
      });

      result.current.mutate('conv-123');

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockApiClient.post).toHaveBeenCalledWith('/conversations/conv-123/unassign');
    });
  });

  describe('useResolveConversation', () => {
    it('should resolve conversation', async () => {
      mockApiClient.post.mockResolvedValueOnce({ success: true });

      const { result } = renderHook(() => useResolveConversation(), {
        wrapper: createWrapper(),
      });

      result.current.mutate('conv-123');

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockApiClient.post).toHaveBeenCalledWith('/conversations/conv-123/resolve');
    });
  });

  describe('useReopenConversation', () => {
    it('should reopen conversation', async () => {
      mockApiClient.post.mockResolvedValueOnce({ success: true });

      const { result } = renderHook(() => useReopenConversation(), {
        wrapper: createWrapper(),
      });

      result.current.mutate('conv-123');

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockApiClient.post).toHaveBeenCalledWith('/conversations/conv-123/reopen');
    });
  });

  describe('useSendMessage', () => {
    it('should send text message', async () => {
      mockApiClient.post.mockResolvedValueOnce(mockMessage);

      const { result } = renderHook(() => useSendMessage(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        conversationId: 'conv-123',
        type: 'text',
        content: 'Hello!',
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockApiClient.post).toHaveBeenCalledWith('/messages', {
        conversationId: 'conv-123',
        type: 'text',
        content: 'Hello!',
      });
    });

    it('should send media message', async () => {
      const mediaMessage = { ...mockMessage, type: 'image' as const, mediaUrl: 'https://example.com/image.jpg' };
      mockApiClient.post.mockResolvedValueOnce(mediaMessage);

      const { result } = renderHook(() => useSendMessage(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        conversationId: 'conv-123',
        type: 'image',
        mediaUrl: 'https://example.com/image.jpg',
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockApiClient.post).toHaveBeenCalledWith('/messages', {
        conversationId: 'conv-123',
        type: 'image',
        mediaUrl: 'https://example.com/image.jpg',
      });
    });
  });
});
