import * as bcrypt from 'bcryptjs';
import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock bcryptjs
vi.mock('bcryptjs', () => ({
  compare: vi.fn(),
  hash: vi.fn(),
}));

// Mock services
const mockUsersService = {
  findByEmail: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  updateLastSeen: vi.fn(),
};

const mockTenantsService = {
  generateSlug: vi.fn(),
  create: vi.fn(),
};

vi.mock('../../services/users.service', () => ({
  usersService: mockUsersService,
}));

vi.mock('../../services/tenants.service', () => ({
  tenantsService: mockTenantsService,
}));

// Import after mocking
const { authRoutes } = await import('../../routes/auth');

const createAuthToken = () => {
  const session = {
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      role: 'admin',
      tenantId: 'test-tenant-id',
    },
    expires: new Date(Date.now() + 3600000).toISOString(),
  };
  return Buffer.from(JSON.stringify(session)).toString('base64');
};

const authHeaders = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${createAuthToken()}`,
};

const createMockUser = (overrides = {}) => ({
  id: 'user-123',
  tenantId: 'tenant-123',
  email: 'user@example.com',
  name: 'Test User',
  role: 'admin',
  passwordHash: '$2a$12$hashedpassword',
  avatarUrl: null,
  isActive: true,
  lastSeenAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  tenant: {
    id: 'tenant-123',
    name: 'Test Tenant',
    slug: 'test-tenant',
  },
  ...overrides,
});

const createMockTenant = (overrides = {}) => ({
  id: 'tenant-123',
  name: 'Test Company',
  slug: 'test-company',
  plan: 'free',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe('Auth Routes', () => {
  let app: Hono;

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono();
    app.route('/auth', authRoutes);
  });

  describe('POST /auth/login', () => {
    it('should login with valid credentials', async () => {
      const mockUser = createMockUser();
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

      const res = await app.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user@example.com',
          password: 'password123',
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.user.email).toBe('user@example.com');
      expect(mockUsersService.updateLastSeen).toHaveBeenCalledWith('user-123');
    });

    it('should return 401 for invalid email', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      const res = await app.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'nonexistent@example.com',
          password: 'password123',
        }),
      });

      expect(res.status).toBe(401);
    });

    it('should return 401 for deactivated account', async () => {
      mockUsersService.findByEmail.mockResolvedValue(createMockUser({ isActive: false }));

      const res = await app.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user@example.com',
          password: 'password123',
        }),
      });

      expect(res.status).toBe(401);
      const text = await res.text();
      expect(text).toContain('Account is deactivated');
    });

    it('should return 401 for user without password', async () => {
      mockUsersService.findByEmail.mockResolvedValue(createMockUser({ passwordHash: null }));

      const res = await app.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user@example.com',
          password: 'password123',
        }),
      });

      expect(res.status).toBe(401);
    });

    it('should return 401 for wrong password', async () => {
      mockUsersService.findByEmail.mockResolvedValue(createMockUser());
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      const res = await app.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user@example.com',
          password: 'wrongpassword',
        }),
      });

      expect(res.status).toBe(401);
    });

    it('should validate email format', async () => {
      const res = await app.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'not-an-email',
          password: 'password123',
        }),
      });

      expect(res.status).toBe(400);
    });

    it('should validate password minimum length', async () => {
      const res = await app.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user@example.com',
          password: 'short',
        }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /auth/register', () => {
    it('should register a new user', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockTenantsService.generateSlug.mockResolvedValue('my-company');
      mockTenantsService.create.mockResolvedValue(createMockTenant({ name: 'My Company' }));
      vi.mocked(bcrypt.hash).mockResolvedValue('hashedpassword' as never);
      mockUsersService.create.mockResolvedValue(
        createMockUser({ name: 'New User', email: 'new@example.com' }),
      );

      const res = await app.request('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New User',
          email: 'new@example.com',
          password: 'password123',
          company: 'My Company',
        }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.message).toBe('Registration successful');
      expect(mockTenantsService.create).toHaveBeenCalled();
      expect(mockUsersService.create).toHaveBeenCalled();
    });

    it('should return 409 for existing email', async () => {
      mockUsersService.findByEmail.mockResolvedValue(createMockUser());

      const res = await app.request('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New User',
          email: 'existing@example.com',
          password: 'password123',
          company: 'My Company',
        }),
      });

      expect(res.status).toBe(409);
      const text = await res.text();
      expect(text).toContain('Email already registered');
    });

    it('should validate name minimum length', async () => {
      const res = await app.request('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'X',
          email: 'new@example.com',
          password: 'password123',
          company: 'My Company',
        }),
      });

      expect(res.status).toBe(400);
    });

    it('should validate company minimum length', async () => {
      const res = await app.request('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New User',
          email: 'new@example.com',
          password: 'password123',
          company: 'X',
        }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /auth/me', () => {
    it('should return current user', async () => {
      mockUsersService.findById.mockResolvedValue(createMockUser());

      const res = await app.request('/auth/me', {
        method: 'GET',
        headers: authHeaders,
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.email).toBe('user@example.com');
    });

    it('should return 404 if user not found', async () => {
      mockUsersService.findById.mockResolvedValue(null);

      const res = await app.request('/auth/me', {
        method: 'GET',
        headers: authHeaders,
      });

      expect(res.status).toBe(404);
    });

    it('should return 401 without auth', async () => {
      const res = await app.request('/auth/me', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /auth/change-password', () => {
    it('should change password successfully', async () => {
      mockUsersService.findByEmail.mockResolvedValue(createMockUser());
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      vi.mocked(bcrypt.hash).mockResolvedValue('newhashed' as never);
      mockUsersService.update.mockResolvedValue(createMockUser());

      const res = await app.request('/auth/change-password', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          currentPassword: 'oldpassword123',
          newPassword: 'newpassword123',
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.message).toBe('Password changed successfully');
    });

    it('should return 400 for invalid new password', async () => {
      const res = await app.request('/auth/change-password', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          currentPassword: 'oldpassword123',
          newPassword: 'short',
        }),
      });

      expect(res.status).toBe(400);
    });

    it('should return 400 for missing fields', async () => {
      const res = await app.request('/auth/change-password', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
    });

    it('should return 404 if user not found', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      const res = await app.request('/auth/change-password', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          currentPassword: 'oldpassword123',
          newPassword: 'newpassword123',
        }),
      });

      expect(res.status).toBe(404);
    });

    it('should return 401 for wrong current password', async () => {
      mockUsersService.findByEmail.mockResolvedValue(createMockUser());
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      const res = await app.request('/auth/change-password', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          currentPassword: 'wrongpassword',
          newPassword: 'newpassword123',
        }),
      });

      expect(res.status).toBe(401);
    });

    it('should return 401 without auth', async () => {
      const res = await app.request('/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: 'oldpassword123',
          newPassword: 'newpassword123',
        }),
      });

      expect(res.status).toBe(401);
    });
  });
});
