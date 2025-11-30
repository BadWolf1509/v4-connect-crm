import * as SecureStore from 'expo-secure-store';
import { api, ApiError } from '../../services/api';

// Type-safe access to mocked fetch
const mockFetch = globalThis.fetch as jest.Mock;

describe('API Service', () => {
  const mockResponse = (data: unknown, status = 200) => {
    return Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(data),
      text: () => Promise.resolve(JSON.stringify(data)),
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
  });

  describe('api.get', () => {
    it('should make GET request to correct URL', async () => {
      mockFetch.mockImplementation(() =>
        mockResponse({ data: 'test' })
      );

      await api.get('/users');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/users'),
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should include auth token in headers when available', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('test-token');
      mockFetch.mockImplementation(() =>
        mockResponse({ data: 'test' })
      );

      await api.get('/protected');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });

    it('should not include auth header when no token', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
      mockFetch.mockImplementation(() =>
        mockResponse({ data: 'test' })
      );

      await api.get('/public');

      const callArgs = mockFetch.mock.calls[0][1];
      expect(callArgs.headers.Authorization).toBeUndefined();
    });

    it('should add query params to URL', async () => {
      mockFetch.mockImplementation(() =>
        mockResponse({ data: 'test' })
      );

      await api.get('/users', { params: { page: 1, limit: 10 } });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('page=1'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=10'),
        expect.any(Object)
      );
    });

    it('should skip undefined params', async () => {
      mockFetch.mockImplementation(() =>
        mockResponse({ data: 'test' })
      );

      await api.get('/users', { params: { page: 1, filter: undefined } });

      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain('page=1');
      expect(url).not.toContain('filter');
    });
  });

  describe('api.post', () => {
    it('should make POST request with JSON body', async () => {
      mockFetch.mockImplementation(() =>
        mockResponse({ id: 1 })
      );

      await api.post('/users', { name: 'John', email: 'john@example.com' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/users'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'John', email: 'john@example.com' }),
        })
      );
    });

    it('should set Content-Type header', async () => {
      mockFetch.mockImplementation(() =>
        mockResponse({ id: 1 })
      );

      await api.post('/users', { name: 'John' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should handle post without body', async () => {
      mockFetch.mockImplementation(() =>
        mockResponse({ success: true })
      );

      await api.post('/action');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/action'),
        expect.objectContaining({
          method: 'POST',
          body: undefined,
        })
      );
    });
  });

  describe('api.put', () => {
    it('should make PUT request', async () => {
      mockFetch.mockImplementation(() =>
        mockResponse({ updated: true })
      );

      await api.put('/users/1', { name: 'Updated' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/1'),
        expect.objectContaining({ method: 'PUT' })
      );
    });
  });

  describe('api.patch', () => {
    it('should make PATCH request', async () => {
      mockFetch.mockImplementation(() =>
        mockResponse({ patched: true })
      );

      await api.patch('/users/1', { status: 'active' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/1'),
        expect.objectContaining({ method: 'PATCH' })
      );
    });
  });

  describe('api.delete', () => {
    it('should make DELETE request', async () => {
      mockFetch.mockImplementation(() =>
        mockResponse({})
      );

      await api.delete('/users/1');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/1'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  describe('error handling', () => {
    it('should throw ApiError on non-ok response', async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ message: 'Unauthorized' }),
          text: () => Promise.resolve(''),
        })
      );

      await expect(api.get('/protected')).rejects.toThrow('Unauthorized');
    });

    it('should include status code in ApiError', async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: false,
          status: 404,
          json: () => Promise.resolve({ message: 'Not found' }),
          text: () => Promise.resolve(''),
        })
      );

      try {
        await api.get('/unknown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).status).toBe(404);
      }
    });

    it('should handle JSON parse error in error response', async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.reject(new Error('Parse error')),
          text: () => Promise.resolve(''),
        })
      );

      await expect(api.get('/error')).rejects.toThrow('Request failed');
    });
  });

  describe('empty response handling', () => {
    it('should handle empty response body', async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          status: 204,
          json: () => Promise.reject(new Error('No content')),
          text: () => Promise.resolve(''),
        })
      );

      const result = await api.delete('/users/1');
      expect(result).toEqual({});
    });
  });

  describe('SecureStore integration', () => {
    it('should get token from SecureStore', async () => {
      mockFetch.mockImplementation(() =>
        mockResponse({ data: 'test' })
      );

      await api.get('/test');

      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('token');
    });

    it('should handle SecureStore errors gracefully', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockRejectedValue(
        new Error('SecureStore error')
      );
      mockFetch.mockImplementation(() =>
        mockResponse({ data: 'test' })
      );

      // Should not throw, should proceed without token
      const result = await api.get('/test');
      expect(result).toEqual({ data: 'test' });
    });
  });
});

describe('ApiError', () => {
  it('should have correct name', () => {
    const error = new ApiError('Test error', 400);
    expect(error.name).toBe('ApiError');
  });

  it('should have message and status', () => {
    const error = new ApiError('Not found', 404);
    expect(error.message).toBe('Not found');
    expect(error.status).toBe(404);
  });

  it('should be instanceof Error', () => {
    const error = new ApiError('Error', 500);
    expect(error).toBeInstanceOf(Error);
  });
});
