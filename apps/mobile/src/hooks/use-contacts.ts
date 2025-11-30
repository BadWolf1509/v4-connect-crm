import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

export interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  tags: string[];
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface ContactsResponse {
  contacts: Contact[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface ContactFilters {
  search?: string;
  tag?: string;
  page?: number;
  limit?: number;
}

interface CreateContactData {
  name: string;
  email?: string;
  phone?: string;
  tags?: string[];
}

export function useContacts(filters: ContactFilters = {}) {
  return useQuery({
    queryKey: ['contacts', filters],
    queryFn: () =>
      api.get<ContactsResponse>('/contacts', {
        params: {
          search: filters.search,
          tag: filters.tag,
          page: filters.page || 1,
          limit: filters.limit || 50,
        },
      }),
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useContact(id: string) {
  return useQuery({
    queryKey: ['contact', id],
    queryFn: () => api.get<Contact>(`/contacts/${id}`),
    enabled: !!id,
  });
}

export function useCreateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateContactData) => api.post<Contact>('/contacts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<CreateContactData>) =>
      api.patch<Contact>(`/contacts/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contact', variables.id] });
    },
  });
}
