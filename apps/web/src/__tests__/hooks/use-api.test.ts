import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useApi } from '@/hooks/use-api';

// Mock next-auth/react
const mockSession = {
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    role: 'admin',
    tenantId: 'test-tenant-id',
  },
  expires: new Date(Date.now() + 3600000).toISOString(),
};

vi.mock('next-auth/react', () => ({
  useSession: vi.fn(() => ({
    data: mockSession,
    status: 'authenticated',
  })),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  describe('initialization', () => {
    it('should return api object and isAuthenticated true when session exists', () => {
      const { result } = renderHook(() => useApi());

      expect(result.current.api).toBeDefined();
      expect(result.current.api.get).toBeInstanceOf(Function);
      expect(result.current.api.post).toBeInstanceOf(Function);
      expect(result.current.api.patch).toBeInstanceOf(Function);
      expect(result.current.api.put).toBeInstanceOf(Function);
      expect(result.current.api.delete).toBeInstanceOf(Function);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should return isAuthenticated false when no session', async () => {
      const useSession = await import('next-auth/react');
      vi.mocked(useSession.useSession).mockReturnValueOnce({
        data: null,
        status: 'unauthenticated',
        update: vi.fn(),
      });

      const { result } = renderHook(() => useApi());

      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('api.get', () => {
    it('should make GET request with correct URL and headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
      });

      const { result } = renderHook(() => useApi());

      const response = await result.current.api.get('/test-endpoint');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('http://localhost:3001/api/v1/test-endpoint');
      expect(options.method).toBe('GET');
      expect(options.headers['Content-Type']).toBe('application/json');
      expect(options.headers.Authorization).toMatch(/^Bearer /);
      expect(options.credentials).toBe('include');
      expect(response).toEqual({ data: 'test' });
    });

    it('should include query params in URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const { result } = renderHook(() => useApi());

      await result.current.api.get('/test', {
        params: { page: 1, limit: 10, search: 'test' },
      });

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('page=1');
      expect(url).toContain('limit=10');
      expect(url).toContain('search=test');
    });

    it('should exclude undefined params from URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const { result } = renderHook(() => useApi());

      await result.current.api.get('/test', {
        params: { page: 1, filter: undefined },
      });

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('page=1');
      expect(url).not.toContain('filter');
    });
  });

  describe('api.post', () => {
    it('should make POST request with body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: '123' }),
      });

      const { result } = renderHook(() => useApi());

      const body = { name: 'Test', value: 100 };
      const response = await result.current.api.post('/items', body);

      const [, options] = mockFetch.mock.calls[0];
      expect(options.method).toBe('POST');
      expect(options.body).toBe(JSON.stringify(body));
      expect(response).toEqual({ id: '123' });
    });

    it('should handle POST without body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const { result } = renderHook(() => useApi());

      await result.current.api.post('/items/123/action');

      const [, options] = mockFetch.mock.calls[0];
      expect(options.body).toBeUndefined();
    });
  });

  describe('api.patch', () => {
    it('should make PATCH request with body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ updated: true }),
      });

      const { result } = renderHook(() => useApi());

      await result.current.api.patch('/items/123', { name: 'Updated' });

      const [, options] = mockFetch.mock.calls[0];
      expect(options.method).toBe('PATCH');
      expect(options.body).toBe(JSON.stringify({ name: 'Updated' }));
    });
  });

  describe('api.put', () => {
    it('should make PUT request with body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ replaced: true }),
      });

      const { result } = renderHook(() => useApi());

      await result.current.api.put('/items/123', { name: 'Replaced' });

      const [, options] = mockFetch.mock.calls[0];
      expect(options.method).toBe('PUT');
    });
  });

  describe('api.delete', () => {
    it('should make DELETE request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ deleted: true }),
      });

      const { result } = renderHook(() => useApi());

      await result.current.api.delete('/items/123');

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/items/123');
      expect(options.method).toBe('DELETE');
    });
  });

  describe('error handling', () => {
    it('should throw error on non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Not Found' }),
      });

      const { result } = renderHook(() => useApi());

      await expect(result.current.api.get('/not-found')).rejects.toThrow('Not Found');
    });

    it('should throw generic error when response has no message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({}),
      });

      const { result } = renderHook(() => useApi());

      await expect(result.current.api.get('/error')).rejects.toThrow('Request failed');
    });

    it('should handle JSON parse error gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.reject(new Error('Parse error')),
      });

      const { result } = renderHook(() => useApi());

      await expect(result.current.api.get('/error')).rejects.toThrow('Request failed');
    });
  });

  describe('authorization header', () => {
    it('should encode session as base64 in Authorization header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const { result } = renderHook(() => useApi());

      await result.current.api.get('/test');

      const [, options] = mockFetch.mock.calls[0];
      const authHeader = options.headers.Authorization;
      expect(authHeader).toMatch(/^Bearer [A-Za-z0-9+/=]+$/);

      // Decode and verify
      const token = authHeader.replace('Bearer ', '');
      const decoded = JSON.parse(decodeURIComponent(escape(atob(token))));
      expect(decoded.user.id).toBe('test-user-id');
    });

    it('should not include Authorization header when no session', async () => {
      const useSession = await import('next-auth/react');
      vi.mocked(useSession.useSession).mockReturnValueOnce({
        data: null,
        status: 'unauthenticated',
        update: vi.fn(),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const { result } = renderHook(() => useApi());

      await result.current.api.get('/test');

      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers.Authorization).toBeUndefined();
    });
  });
});
