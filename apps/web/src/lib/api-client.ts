// Client-side API client (for use in React components)

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

function buildUrl(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
): string {
  const url = new URL(`${API_URL}/api/v1${path}`);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.append(key, String(value));
      }
    }
  }

  return url.toString();
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options?: RequestOptions,
): Promise<T> {
  const url = buildUrl(path, options?.params);

  const response = await fetch(url, {
    ...options,
    method,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || 'Request failed');
  }

  return response.json();
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, undefined, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('POST', path, body, options),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PATCH', path, body, options),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>('DELETE', path, undefined, options),
};

// Auth API (public endpoints)
export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<{ user: User }>('/auth/login', { email, password }),

  register: (data: { name: string; email: string; password: string; company: string }) =>
    apiClient.post<{ message: string; user: User }>('/auth/register', data),

  me: () => apiClient.get<User>('/auth/me'),
};

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string;
  avatarUrl?: string;
  tenant?: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  tags: string[];
  customFields: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  id: string;
  status: 'pending' | 'open' | 'resolved' | 'snoozed';
  contact: {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    avatarUrl?: string;
  };
  channel: {
    id: string;
    type: string;
    name: string;
  };
  assignee?: {
    id: string;
    name: string;
    email: string;
  };
  lastMessageAt: string;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'location';
  content?: string;
  mediaUrl?: string;
  senderId: string;
  senderType: 'user' | 'contact';
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  createdAt: string;
}

export interface Pipeline {
  id: string;
  name: string;
  isDefault: boolean;
  stages: Stage[];
  createdAt: string;
}

export interface Stage {
  id: string;
  name: string;
  color: string;
  order: number;
  dealCount: number;
}

export interface Deal {
  id: string;
  title: string;
  value?: string;
  currency: string;
  status: 'open' | 'won' | 'lost';
  contact?: {
    id: string;
    name: string;
    phone?: string;
    email?: string;
  };
  stage?: {
    id: string;
    name: string;
    color?: string;
  };
  assignee?: {
    id: string;
    name: string;
  };
  expectedCloseDate?: string;
  probability?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
