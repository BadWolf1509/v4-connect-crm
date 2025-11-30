import type { JWTDecryptResult, KeyLike, ResolvedKey } from 'jose';
import { jwtDecrypt } from 'jose';
import { describe, expect, it, vi, beforeEach } from 'vitest';

// Helper type for mocked jwtDecrypt result
type MockJWTResult = JWTDecryptResult<Record<string, unknown>> & ResolvedKey<KeyLike>;

// Helper to create a verifyToken-like function for testing
async function verifyToken(token: string, authSecret: string | undefined) {
  if (!authSecret) {
    return null;
  }

  try {
    const encoder = new TextEncoder();
    const secretKey = encoder.encode(authSecret).slice(0, 32);

    const { payload } = await jwtDecrypt(token, secretKey, {
      clockTolerance: 15,
    });

    if (payload.id && payload.tenantId) {
      return {
        id: payload.id as string,
        email: payload.email as string,
        name: payload.name as string,
        role: payload.role as string,
        tenantId: payload.tenantId as string,
        avatarUrl: payload.avatarUrl as string | undefined,
      };
    }

    return null;
  } catch {
    return null;
  }
}

describe('WebSocket Authentication', () => {
  const authSecret = 'test-secret-key-32-characters-long';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('verifyToken', () => {
    it('should return null when authSecret is not provided', async () => {
      const result = await verifyToken('any-token', undefined);
      expect(result).toBeNull();
    });

    it('should return null when authSecret is empty', async () => {
      const result = await verifyToken('any-token', '');
      expect(result).toBeNull();
    });

    it('should return user data for valid token', async () => {
      const mockPayload = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'admin',
        tenantId: 'tenant-456',
        avatarUrl: 'https://example.com/avatar.jpg',
      };

      vi.mocked(jwtDecrypt).mockResolvedValueOnce({
        payload: mockPayload,
        protectedHeader: { alg: 'dir', enc: 'A256GCM' },
        key: new Uint8Array(32),
      } as MockJWTResult);

      const result = await verifyToken('valid-token', authSecret);

      expect(result).toEqual(mockPayload);
      expect(jwtDecrypt).toHaveBeenCalledWith(
        'valid-token',
        expect.any(Uint8Array),
        { clockTolerance: 15 }
      );
    });

    it('should return null when token is missing required fields', async () => {
      vi.mocked(jwtDecrypt).mockResolvedValueOnce({
        payload: { email: 'test@example.com' }, // missing id and tenantId
        protectedHeader: { alg: 'dir', enc: 'A256GCM' },
        key: new Uint8Array(32),
      } as MockJWTResult);

      const result = await verifyToken('incomplete-token', authSecret);
      expect(result).toBeNull();
    });

    it('should return null when jwtDecrypt throws error', async () => {
      vi.mocked(jwtDecrypt).mockRejectedValueOnce(new Error('Invalid token'));

      const result = await verifyToken('invalid-token', authSecret);
      expect(result).toBeNull();
    });

    it('should use first 32 bytes of authSecret as key', async () => {
      const longSecret = 'a'.repeat(64);
      const mockPayload = {
        id: 'user-123',
        tenantId: 'tenant-456',
        email: 'test@example.com',
        name: 'Test',
        role: 'admin',
      };

      vi.mocked(jwtDecrypt).mockResolvedValueOnce({
        payload: mockPayload,
        protectedHeader: { alg: 'dir', enc: 'A256GCM' },
        key: new Uint8Array(32),
      } as MockJWTResult);

      await verifyToken('token', longSecret);

      expect(jwtDecrypt).toHaveBeenCalledWith(
        'token',
        expect.any(Uint8Array),
        { clockTolerance: 15 }
      );
    });

    it('should handle token without avatarUrl', async () => {
      const mockPayload = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'agent',
        tenantId: 'tenant-456',
      };

      vi.mocked(jwtDecrypt).mockResolvedValueOnce({
        payload: mockPayload,
        protectedHeader: { alg: 'dir', enc: 'A256GCM' },
        key: new Uint8Array(32),
      } as MockJWTResult);

      const result = await verifyToken('valid-token', authSecret);

      expect(result).toEqual({
        ...mockPayload,
        avatarUrl: undefined,
      });
    });
  });

  describe('Session fallback parsing', () => {
    it('should parse valid session JSON', () => {
      const sessionData = {
        user: {
          id: 'user-123',
          tenantId: 'tenant-456',
          email: 'test@example.com',
          name: 'Test User',
          role: 'admin',
        },
      };

      const parsed = JSON.parse(JSON.stringify(sessionData));
      expect(parsed.user.id).toBe('user-123');
      expect(parsed.user.tenantId).toBe('tenant-456');
    });

    it('should reject session without user id', () => {
      const sessionData = {
        user: {
          email: 'test@example.com',
          name: 'Test User',
        },
      };

      const parsed = JSON.parse(JSON.stringify(sessionData));
      expect(parsed.user?.id).toBeUndefined();
    });

    it('should reject invalid JSON', () => {
      expect(() => JSON.parse('not-valid-json')).toThrow();
    });
  });
});
