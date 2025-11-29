'use client';

import { useSession } from 'next-auth/react';
import { useCallback, useMemo } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface RequestOptions extends Omit<RequestInit, 'body'> {
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

export function useApi() {
  const { data: session } = useSession();

  const request = useCallback(
    async <T>(
      method: string,
      path: string,
      body?: unknown,
      options?: RequestOptions,
    ): Promise<T> => {
      const url = buildUrl(path, options?.params);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options?.headers as Record<string, string>),
      };

      // Add authorization header with session token
      if (session) {
        headers.Authorization = `Bearer ${JSON.stringify(session)}`;
      }

      const response = await fetch(url, {
        ...options,
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Request failed' }));
        throw new Error(error.message || 'Request failed');
      }

      return response.json();
    },
    [session],
  );

  const api = useMemo(
    () => ({
      get: <T>(path: string, options?: RequestOptions) =>
        request<T>('GET', path, undefined, options),
      post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
        request<T>('POST', path, body, options),
      patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
        request<T>('PATCH', path, body, options),
      put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
        request<T>('PUT', path, body, options),
      delete: <T>(path: string, options?: RequestOptions) =>
        request<T>('DELETE', path, undefined, options),
    }),
    [request],
  );

  return {
    api,
    isAuthenticated: !!session,
  };
}
