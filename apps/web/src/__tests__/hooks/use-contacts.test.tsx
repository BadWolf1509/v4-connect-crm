import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockApiClient = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@/lib/api-client', () => ({
  apiClient: mockApiClient,
}));

// Import hooks after mocking
import {
  useContact,
  useContacts,
  useCreateContact,
  useDeleteContact,
  useUpdateContact,
} from '@/hooks/use-contacts';

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

const mockContact = {
  id: 'contact-123',
  name: 'John Doe',
  email: 'john@example.com',
  phone: '+5511999999999',
  avatarUrl: null,
  tags: ['lead', 'vip'],
  customFields: { company: 'Acme Inc' },
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockContactsResponse = {
  contacts: [mockContact],
  pagination: {
    page: 1,
    limit: 20,
    total: 1,
    totalPages: 1,
  },
};

describe('useContacts hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useContacts', () => {
    it('should fetch contacts with default filters', async () => {
      mockApiClient.get.mockResolvedValueOnce(mockContactsResponse);

      const { result } = renderHook(() => useContacts(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockApiClient.get).toHaveBeenCalledWith('/contacts', {
        params: {
          page: undefined,
          limit: undefined,
          search: undefined,
          tag: undefined,
        },
      });
      expect(result.current.data).toEqual(mockContactsResponse);
    });

    it('should fetch contacts with filters', async () => {
      mockApiClient.get.mockResolvedValueOnce(mockContactsResponse);

      const { result } = renderHook(
        () =>
          useContacts({
            page: 2,
            limit: 10,
            search: 'john',
            tag: 'vip',
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockApiClient.get).toHaveBeenCalledWith('/contacts', {
        params: {
          page: 2,
          limit: 10,
          search: 'john',
          tag: 'vip',
        },
      });
    });

    it('should handle loading state', () => {
      mockApiClient.get.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockContactsResponse), 100)),
      );

      const { result } = renderHook(() => useContacts(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
    });

    it('should handle error state', async () => {
      mockApiClient.get.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useContacts(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error?.message).toBe('Network error');
    });
  });

  describe('useContact', () => {
    it('should fetch single contact by id', async () => {
      mockApiClient.get.mockResolvedValueOnce(mockContact);

      const { result } = renderHook(() => useContact('contact-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockApiClient.get).toHaveBeenCalledWith('/contacts/contact-123');
      expect(result.current.data).toEqual(mockContact);
    });

    it('should not fetch when id is empty', () => {
      const { result } = renderHook(() => useContact(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(mockApiClient.get).not.toHaveBeenCalled();
    });
  });

  describe('useCreateContact', () => {
    it('should create a new contact', async () => {
      mockApiClient.post.mockResolvedValueOnce(mockContact);

      const { result } = renderHook(() => useCreateContact(), {
        wrapper: createWrapper(),
      });

      const newContact = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+5511999999999',
      };

      result.current.mutate(newContact);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockApiClient.post).toHaveBeenCalledWith('/contacts', newContact);
    });

    it('should handle creation error', async () => {
      mockApiClient.post.mockRejectedValueOnce(new Error('Validation failed'));

      const { result } = renderHook(() => useCreateContact(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ name: '' });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error?.message).toBe('Validation failed');
    });
  });

  describe('useUpdateContact', () => {
    it('should update an existing contact', async () => {
      const updatedContact = { ...mockContact, name: 'Jane Doe' };
      mockApiClient.patch.mockResolvedValueOnce(updatedContact);

      const { result } = renderHook(() => useUpdateContact(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        id: 'contact-123',
        data: { name: 'Jane Doe' },
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockApiClient.patch).toHaveBeenCalledWith('/contacts/contact-123', {
        name: 'Jane Doe',
      });
    });
  });

  describe('useDeleteContact', () => {
    it('should delete a contact', async () => {
      mockApiClient.delete.mockResolvedValueOnce({ success: true });

      const { result } = renderHook(() => useDeleteContact(), {
        wrapper: createWrapper(),
      });

      result.current.mutate('contact-123');

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockApiClient.delete).toHaveBeenCalledWith('/contacts/contact-123');
    });
  });
});
