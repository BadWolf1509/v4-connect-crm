import { auth } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async getHeaders(): Promise<HeadersInit> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Get session for auth token
    const session = await auth();
    if (session?.user) {
      // For now, we'll send user info in headers
      // In production, you'd use a proper JWT
      headers['X-User-Id'] = session.user.id;
      headers['X-Tenant-Id'] = session.user.tenantId;
    }

    return headers;
  }

  private buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
    const url = new URL(`${this.baseUrl}/api/v1${path}`);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    return url.toString();
  }

  async get<T>(path: string, options?: RequestOptions): Promise<T> {
    const headers = await this.getHeaders();
    const url = this.buildUrl(path, options?.params);

    const response = await fetch(url, {
      ...options,
      method: 'GET',
      headers: { ...headers, ...options?.headers },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || 'Request failed');
    }

    return response.json();
  }

  async post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    const headers = await this.getHeaders();
    const url = this.buildUrl(path, options?.params);

    const response = await fetch(url, {
      ...options,
      method: 'POST',
      headers: { ...headers, ...options?.headers },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || 'Request failed');
    }

    return response.json();
  }

  async patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    const headers = await this.getHeaders();
    const url = this.buildUrl(path, options?.params);

    const response = await fetch(url, {
      ...options,
      method: 'PATCH',
      headers: { ...headers, ...options?.headers },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || 'Request failed');
    }

    return response.json();
  }

  async delete<T>(path: string, options?: RequestOptions): Promise<T> {
    const headers = await this.getHeaders();
    const url = this.buildUrl(path, options?.params);

    const response = await fetch(url, {
      ...options,
      method: 'DELETE',
      headers: { ...headers, ...options?.headers },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || 'Request failed');
    }

    return response.json();
  }
}

export const api = new ApiClient(API_URL);

// Public API client (no auth required)
export async function publicApi<T>(
  path: string,
  options?: RequestInit & { params?: Record<string, string> }
): Promise<T> {
  const url = new URL(`${API_URL}/api/v1${path}`);

  if (options?.params) {
    Object.entries(options.params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }

  const response = await fetch(url.toString(), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || 'Request failed');
  }

  return response.json();
}
