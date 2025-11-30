import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the teams service
const mockTeamsService = {
  findAll: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  getMembers: vi.fn(),
  addMember: vi.fn(),
  removeMember: vi.fn(),
};

vi.mock('../../services/teams.service', () => ({
  teamsService: mockTeamsService,
}));

// Import after mocking
const { teamsRoutes } = await import('../../routes/teams');

// Create a valid test token
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

const validUserId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

const createMockTeam = (overrides = {}) => ({
  id: 'team-123',
  tenantId: 'test-tenant-id',
  name: 'Support Team',
  description: 'Team for support tickets',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const createMockMember = (overrides = {}) => ({
  id: 'member-123',
  teamId: 'team-123',
  userId: validUserId,
  createdAt: new Date().toISOString(),
  ...overrides,
});

describe('Teams Routes', () => {
  let app: Hono;

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono();
    app.route('/teams', teamsRoutes);
  });

  describe('GET /teams', () => {
    it('should return list of teams', async () => {
      const mockTeams = [createMockTeam(), createMockTeam({ id: 'team-456', name: 'Sales' })];
      mockTeamsService.findAll.mockResolvedValue({ teams: mockTeams });

      const res = await app.request('/teams', {
        method: 'GET',
        headers: authHeaders,
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.teams).toHaveLength(2);
    });
  });

  describe('GET /teams/:id', () => {
    it('should return a team by id', async () => {
      mockTeamsService.findById.mockResolvedValue(createMockTeam());

      const res = await app.request('/teams/team-123', {
        method: 'GET',
        headers: authHeaders,
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.id).toBe('team-123');
    });

    it('should return 404 if team not found', async () => {
      mockTeamsService.findById.mockResolvedValue(null);

      const res = await app.request('/teams/nonexistent', {
        method: 'GET',
        headers: authHeaders,
      });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /teams', () => {
    it('should create a new team', async () => {
      mockTeamsService.create.mockResolvedValue(createMockTeam());

      const res = await app.request('/teams', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          name: 'Support Team',
          description: 'Team for support tickets',
        }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.name).toBe('Support Team');
    });

    it('should validate name minimum length', async () => {
      const res = await app.request('/teams', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ name: 'X' }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /teams/:id', () => {
    it('should update a team', async () => {
      mockTeamsService.update.mockResolvedValue(createMockTeam({ name: 'Updated Team' }));

      const res = await app.request('/teams/team-123', {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ name: 'Updated Team' }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.name).toBe('Updated Team');
    });

    it('should return 404 if team not found', async () => {
      mockTeamsService.update.mockResolvedValue(null);

      const res = await app.request('/teams/nonexistent', {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ name: 'New Name' }),
      });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /teams/:id', () => {
    it('should delete a team', async () => {
      mockTeamsService.delete.mockResolvedValue(createMockTeam());

      const res = await app.request('/teams/team-123', {
        method: 'DELETE',
        headers: authHeaders,
      });

      expect(res.status).toBe(200);
      expect(mockTeamsService.delete).toHaveBeenCalledWith('team-123', 'test-tenant-id');
    });

    it('should return 404 if team not found', async () => {
      mockTeamsService.delete.mockResolvedValue(null);

      const res = await app.request('/teams/nonexistent', {
        method: 'DELETE',
        headers: authHeaders,
      });

      expect(res.status).toBe(404);
    });
  });

  describe('GET /teams/:id/members', () => {
    it('should return team members', async () => {
      mockTeamsService.findById.mockResolvedValue(createMockTeam());
      mockTeamsService.getMembers.mockResolvedValue([createMockMember()]);

      const res = await app.request('/teams/team-123/members', {
        method: 'GET',
        headers: authHeaders,
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.members).toHaveLength(1);
    });

    it('should return 404 if team not found', async () => {
      mockTeamsService.findById.mockResolvedValue(null);

      const res = await app.request('/teams/nonexistent/members', {
        method: 'GET',
        headers: authHeaders,
      });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /teams/:id/members', () => {
    it('should add member to team', async () => {
      mockTeamsService.findById.mockResolvedValue(createMockTeam());
      mockTeamsService.addMember.mockResolvedValue(createMockMember());

      const res = await app.request('/teams/team-123/members', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ userId: validUserId }),
      });

      expect(res.status).toBe(201);
    });

    it('should return 404 if team not found', async () => {
      mockTeamsService.findById.mockResolvedValue(null);

      const res = await app.request('/teams/nonexistent/members', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ userId: validUserId }),
      });

      expect(res.status).toBe(404);
    });

    it('should validate userId is UUID', async () => {
      const res = await app.request('/teams/team-123/members', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ userId: 'not-a-uuid' }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /teams/:id/members/:userId', () => {
    it('should remove member from team', async () => {
      mockTeamsService.findById.mockResolvedValue(createMockTeam());
      mockTeamsService.removeMember.mockResolvedValue(createMockMember());

      const res = await app.request(`/teams/team-123/members/${validUserId}`, {
        method: 'DELETE',
        headers: authHeaders,
      });

      expect(res.status).toBe(200);
    });

    it('should return 404 if team not found', async () => {
      mockTeamsService.findById.mockResolvedValue(null);

      const res = await app.request(`/teams/nonexistent/members/${validUserId}`, {
        method: 'DELETE',
        headers: authHeaders,
      });

      expect(res.status).toBe(404);
    });

    it('should return 404 if member not found', async () => {
      mockTeamsService.findById.mockResolvedValue(createMockTeam());
      mockTeamsService.removeMember.mockResolvedValue(null);

      const res = await app.request(`/teams/team-123/members/${validUserId}`, {
        method: 'DELETE',
        headers: authHeaders,
      });

      expect(res.status).toBe(404);
    });
  });
});
