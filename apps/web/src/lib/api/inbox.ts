'use client';

import type { Conversation, Message } from '@/stores/inbox-store';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

export interface ConversationFilters {
  status?: 'open' | 'pending' | 'resolved' | 'closed';
  channel?: 'whatsapp' | 'instagram' | 'messenger';
  assignedTo?: string;
  unreadOnly?: boolean;
}

export interface SendMessageParams {
  conversationId: string;
  content: string;
  type?: 'text' | 'image' | 'video' | 'audio' | 'document';
  metadata?: Record<string, unknown>;
}

export async function fetchConversations(
  tenantId: string,
  filters?: ConversationFilters,
): Promise<Conversation[]> {
  const params = new URLSearchParams();
  params.append('tenantId', tenantId);

  if (filters?.status) params.append('status', filters.status);
  if (filters?.channel) params.append('channel', filters.channel);
  if (filters?.assignedTo) params.append('assignedTo', filters.assignedTo);
  if (filters?.unreadOnly) params.append('unreadOnly', 'true');

  const response = await fetch(`${API_URL}/api/v1/inbox/conversations?${params}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch conversations');
  }

  const data = await response.json();
  return data.conversations || [];
}

export async function fetchMessages(
  conversationId: string,
  options?: { before?: string; limit?: number },
): Promise<Message[]> {
  const params = new URLSearchParams();
  if (options?.before) params.append('before', options.before);
  if (options?.limit) params.append('limit', options.limit.toString());

  const response = await fetch(
    `${API_URL}/api/v1/inbox/conversations/${conversationId}/messages?${params}`,
    {
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    },
  );

  if (!response.ok) {
    throw new Error('Failed to fetch messages');
  }

  const data = await response.json();
  return data.messages || [];
}

export async function sendMessage(params: SendMessageParams): Promise<Message> {
  const response = await fetch(
    `${API_URL}/api/v1/inbox/conversations/${params.conversationId}/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        content: params.content,
        type: params.type || 'text',
        metadata: params.metadata,
      }),
    },
  );

  if (!response.ok) {
    throw new Error('Failed to send message');
  }

  const data = await response.json();
  return data.message;
}

export async function markAsRead(conversationId: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/v1/inbox/conversations/${conversationId}/read`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to mark as read');
  }
}

export async function updateConversationStatus(
  conversationId: string,
  status: 'open' | 'pending' | 'resolved' | 'closed',
): Promise<void> {
  const response = await fetch(`${API_URL}/api/v1/inbox/conversations/${conversationId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    throw new Error('Failed to update conversation status');
  }
}

export async function assignConversation(conversationId: string, userId: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/v1/inbox/conversations/${conversationId}/assign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ userId }),
  });

  if (!response.ok) {
    throw new Error('Failed to assign conversation');
  }
}
