import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockInvites = [
  {
    id: 'invite-1',
    tenantId: 'test-tenant',
    email: 'newuser@example.com',
    role: 'agent',
    token: 'abc123token',
    status: 'pending',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    createdAt: new Date(),
    invitedById: 'user-1',
    invitedBy: {
      id: 'user-1',
      name: 'Admin User',
      email: 'admin@example.com',
    },
  },
];

const mockTenant = {
  id: 'test-tenant',
  name: 'Test Company',
  slug: 'test-company',
};

const dbChains = {
  select: vi.fn(() => dbChains),
  from: vi.fn(() => dbChains),
  where: vi.fn(() => dbChains),
  leftJoin: vi.fn(() => dbChains),
  orderBy: vi.fn(async () => mockInvites),
  limit: vi.fn(async () => [mockInvites[0]]),
  insert: vi.fn(() => ({
    values: vi.fn(() => ({
      returning: vi.fn(async () => [mockInvites[0]]),
    })),
  })),
  update: vi.fn(() => ({
    set: vi.fn(() => ({
      where: vi.fn(() => ({
        returning: vi.fn(async () => [{ ...mockInvites[0], status: 'accepted' }]),
      })),
    })),
  })),
};

vi.mock('../../lib/db', () => ({
  db: dbChains,
  schema: {
    invites: {
      id: 'id',
      tenantId: 'tenant_id',
      email: 'email',
      role: 'role',
      token: 'token',
      status: 'status',
      expiresAt: 'expires_at',
      invitedById: 'invited_by_id',
      acceptedAt: 'accepted_at',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
    users: {
      id: 'id',
      name: 'name',
      email: 'email',
    },
    tenants: {
      id: 'id',
      name: 'name',
      slug: 'slug',
    },
  },
}));

const { invitesService } = await import('../../services/invites.service');

describe('Invites Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findAll', () => {
    it('returns all invites for tenant with invitedBy info', async () => {
      const result = await invitesService.findAll('test-tenant');

      expect(result.invites).toHaveLength(1);
      expect(dbChains.select).toHaveBeenCalled();
      expect(dbChains.leftJoin).toHaveBeenCalled();
      expect(dbChains.where).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('returns invite when found', async () => {
      const result = await invitesService.findById('invite-1', 'test-tenant');

      expect(result).not.toBeNull();
      expect(dbChains.where).toHaveBeenCalled();
    });

    it('returns null when invite not found', async () => {
      dbChains.limit.mockResolvedValueOnce([]);

      const result = await invitesService.findById('non-existent', 'test-tenant');

      expect(result).toBeNull();
    });
  });

  describe('findByToken', () => {
    it('returns invite with tenant info when found', async () => {
      dbChains.limit.mockResolvedValueOnce([{
        invite: mockInvites[0],
        tenant: mockTenant,
      }]);

      const result = await invitesService.findByToken('abc123token');

      expect(result).not.toBeNull();
      expect(result?.tenant).toBeDefined();
      expect(dbChains.leftJoin).toHaveBeenCalled();
    });

    it('returns null when token not found', async () => {
      dbChains.limit.mockResolvedValueOnce([]);

      const result = await invitesService.findByToken('invalid-token');

      expect(result).toBeNull();
    });
  });

  describe('findPendingByEmail', () => {
    it('returns pending invite for email', async () => {
      const result = await invitesService.findPendingByEmail('newuser@example.com', 'test-tenant');

      expect(result).not.toBeNull();
      expect(dbChains.where).toHaveBeenCalled();
    });

    it('returns null when no pending invite exists', async () => {
      dbChains.limit.mockResolvedValueOnce([]);

      const result = await invitesService.findPendingByEmail('other@example.com', 'test-tenant');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('creates invite with token and expiration', async () => {
      const data = {
        tenantId: 'test-tenant',
        email: 'NewUser@Example.com', // Should be lowercased
        role: 'agent' as const,
        invitedById: 'user-1',
      };

      const result = await invitesService.create(data);

      expect(result).not.toBeNull();
      expect(dbChains.insert).toHaveBeenCalled();
    });
  });

  describe('accept', () => {
    it('updates invite status to accepted', async () => {
      const result = await invitesService.accept('abc123token', 'new-user-id');

      expect(result).not.toBeNull();
      expect(dbChains.update).toHaveBeenCalled();
    });

    it('returns null when invite not found or not pending', async () => {
      dbChains.update.mockImplementationOnce(() => ({
        set: vi.fn(() => ({
          where: vi.fn(() => ({
            returning: vi.fn(async () => []),
          })),
        })),
      }));

      const result = await invitesService.accept('invalid-token', 'new-user-id');

      expect(result).toBeNull();
    });
  });

  describe('revoke', () => {
    it('updates invite status to revoked', async () => {
      dbChains.update.mockImplementationOnce(() => ({
        set: vi.fn(() => ({
          where: vi.fn(() => ({
            returning: vi.fn(async () => [{ ...mockInvites[0], status: 'revoked' }]),
          })),
        })),
      }));

      const result = await invitesService.revoke('invite-1', 'test-tenant');

      expect(result).not.toBeNull();
      expect(dbChains.update).toHaveBeenCalled();
    });

    it('returns null when invite not found or already processed', async () => {
      dbChains.update.mockImplementationOnce(() => ({
        set: vi.fn(() => ({
          where: vi.fn(() => ({
            returning: vi.fn(async () => []),
          })),
        })),
      }));

      const result = await invitesService.revoke('non-existent', 'test-tenant');

      expect(result).toBeNull();
    });
  });

  describe('resend', () => {
    it('generates new token and extends expiration', async () => {
      const result = await invitesService.resend('invite-1', 'test-tenant');

      expect(result).not.toBeNull();
      expect(dbChains.update).toHaveBeenCalled();
    });

    it('returns null when invite not found or not pending', async () => {
      dbChains.update.mockImplementationOnce(() => ({
        set: vi.fn(() => ({
          where: vi.fn(() => ({
            returning: vi.fn(async () => []),
          })),
        })),
      }));

      const result = await invitesService.resend('non-existent', 'test-tenant');

      expect(result).toBeNull();
    });
  });

  describe('isExpired', () => {
    it('returns true when invite is expired', () => {
      const expiredInvite = {
        expiresAt: new Date(Date.now() - 1000), // 1 second ago
        status: 'pending',
      };

      expect(invitesService.isExpired(expiredInvite)).toBe(true);
    });

    it('returns true when status is not pending', () => {
      const acceptedInvite = {
        expiresAt: new Date(Date.now() + 1000 * 60 * 60), // 1 hour from now
        status: 'accepted',
      };

      expect(invitesService.isExpired(acceptedInvite)).toBe(true);
    });

    it('returns false when invite is valid and pending', () => {
      const validInvite = {
        expiresAt: new Date(Date.now() + 1000 * 60 * 60), // 1 hour from now
        status: 'pending',
      };

      expect(invitesService.isExpired(validInvite)).toBe(false);
    });
  });
});
