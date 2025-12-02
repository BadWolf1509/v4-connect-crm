import { describe, expect, it, vi, beforeEach, afterAll } from 'vitest';

const mockFetch = vi.fn();
const originalFetch = global.fetch;

let apiClient: typeof import('../../lib/api-client').apiClient;
let authApi: typeof import('../../lib/api-client').authApi;

async function loadClient() {
  vi.resetModules();
  vi.unstubAllEnvs();
  mockFetch.mockReset();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).fetch = mockFetch;
  vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://api.local');
  ({ apiClient, authApi } = await import('../../lib/api-client'));
}

afterAll(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).fetch = originalFetch;
  vi.unstubAllEnvs();
});

describe('apiClient', () => {
  beforeEach(async () => {
    await loadClient();
  });

  it('builds URL with params and default headers', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    });

    await apiClient.get('/contacts', { params: { page: 2, active: true } });

    const [url, init] = mockFetch.mock.calls[0] ?? [];
    expect(url).toContain('http://api.local/api/v1/contacts');
    expect(url).toContain('page=2');
    expect(url).toContain('active=true');
    expect(init?.headers).toMatchObject({ 'Content-Type': 'application/json' });
    expect(init?.credentials).toBe('include');
  });

  it('sends JSON body and merges headers', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: '1' }),
    });

    await apiClient.post('/deals', { title: 'New' }, { headers: { 'X-Test': 'yes' } });

    const [, init] = mockFetch.mock.calls[0] ?? [];
    expect(init?.method).toBe('POST');
    expect(init?.headers).toMatchObject({ 'X-Test': 'yes' });
    expect(init?.body).toBe(JSON.stringify({ title: 'New' }));
  });

  it('throws on non-ok responses', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Boom' }),
    });

    await expect(apiClient.get('/error')).rejects.toThrow('Boom');
  });
});

describe('authApi', () => {
  beforeEach(async () => {
    await loadClient();
  });

  it('calls login endpoint', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: { id: '1', name: 'Test', email: 't@test.com', role: 'admin', tenantId: 't1' } }),
    });

    const result = await authApi.login('t@test.com', 'pass');
    expect(result.user.id).toBe('1');
    const [url] = mockFetch.mock.calls[0] ?? [];
    expect(url).toContain('/auth/login');
  });
});
