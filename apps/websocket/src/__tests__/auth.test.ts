import type { JWTDecryptResult, KeyLike, ResolvedKey } from 'jose';
import { jwtDecrypt } from 'jose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type MockJWTResult = JWTDecryptResult<Record<string, unknown>> & ResolvedKey<KeyLike>;

const loadModule = async () => {
  return import('../index');
};

describe('WebSocket authentication', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv('AUTH_SECRET', 'test-secret-key-32-characters-long');
  });

  it('returns user payload when token is valid', async () => {
    const payload = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'admin',
      tenantId: 'tenant-456',
      avatarUrl: 'https://example.com/avatar.jpg',
    };

    vi.mocked(jwtDecrypt).mockResolvedValueOnce({
      payload,
      protectedHeader: { alg: 'dir', enc: 'A256GCM' },
      key: new Uint8Array(32),
    } as MockJWTResult);

    const { verifyToken } = await loadModule();
    const result = await verifyToken('valid-token');

    expect(result).toEqual(payload);
    expect(jwtDecrypt).toHaveBeenCalledWith('valid-token', expect.any(Uint8Array), {
      clockTolerance: 15,
    });
  });

  it('returns null when AUTH_SECRET is missing', async () => {
    vi.stubEnv('AUTH_SECRET', '');
    const { verifyToken } = await loadModule();
    const result = await verifyToken('any-token');
    expect(result).toBeNull();
  });

  it('returns null when token payload is incomplete', async () => {
    vi.mocked(jwtDecrypt).mockResolvedValueOnce({
      payload: { email: 'test@example.com' },
      protectedHeader: { alg: 'dir', enc: 'A256GCM' },
      key: new Uint8Array(32),
    } as MockJWTResult);

    const { verifyToken } = await loadModule();
    const result = await verifyToken('incomplete-token');
    expect(result).toBeNull();
  });

  it('handles jwtDecrypt failures gracefully', async () => {
    vi.mocked(jwtDecrypt).mockRejectedValueOnce(new Error('Invalid token'));

    const { verifyToken } = await loadModule();
    const result = await verifyToken('invalid-token');

    expect(result).toBeNull();
  });

  it('authentication middleware accepts session JSON fallback', async () => {
    const { io } = await loadModule();
    const middleware = vi.mocked(io.use).mock.calls[0]?.[0] as (
      socket: any,
      next: (err?: Error) => void,
    ) => Promise<void>;

    const socket = {
      handshake: {
        auth: {
          token: JSON.stringify({
            user: {
              id: 'user-abc',
              tenantId: 'tenant-xyz',
              email: 'test@example.com',
              name: 'Test User',
              role: 'agent',
            },
          }),
        },
      },
      data: {} as Record<string, unknown>,
    };

    const next = vi.fn();
    await middleware(socket, next);

    expect(socket.data.userId).toBe('user-abc');
    expect(socket.data.tenantId).toBe('tenant-xyz');
    expect(socket.data.role).toBe('agent');
    expect(next).toHaveBeenCalledWith();
  });

  it('authentication middleware rejects missing token', async () => {
    const { io } = await loadModule();
    const middleware = vi.mocked(io.use).mock.calls[0]?.[0] as (
      socket: any,
      next: (err?: Error) => void,
    ) => Promise<void>;

    const socket = {
      handshake: { auth: {} },
      data: {},
    };

    const next = vi.fn();
    await middleware(socket, next);

    expect(next).toHaveBeenCalled();
    const errorArg = next.mock.calls[0]?.[0] as Error | undefined;
    expect(errorArg).toBeInstanceOf(Error);
    expect(errorArg?.message).toBe('Authentication required');
  });
});
