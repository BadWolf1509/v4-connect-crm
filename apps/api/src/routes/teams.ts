import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { HTTPException } from 'hono/http-exception';
import { requireAuth } from '../middleware/auth';
import { teamsService } from '../services/teams.service';

const teamsRoutes = new Hono();

teamsRoutes.use('*', requireAuth);

const createTeamSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
});

const updateTeamSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
});

const addMemberSchema = z.object({
  userId: z.string().uuid(),
});

// List teams
teamsRoutes.get('/', async (c) => {
  const auth = c.get('auth');

  const result = await teamsService.findAll(auth.tenantId);

  return c.json(result);
});

// Get team by ID
teamsRoutes.get('/:id', async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');

  const team = await teamsService.findById(id, auth.tenantId);

  if (!team) {
    throw new HTTPException(404, { message: 'Team not found' });
  }

  return c.json(team);
});

// Create team
teamsRoutes.post('/', zValidator('json', createTeamSchema), async (c) => {
  const auth = c.get('auth');
  const data = c.req.valid('json');

  const team = await teamsService.create({
    tenantId: auth.tenantId,
    name: data.name,
    description: data.description,
  });

  return c.json(team, 201);
});

// Update team
teamsRoutes.patch('/:id', zValidator('json', updateTeamSchema), async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');
  const data = c.req.valid('json');

  const team = await teamsService.update(id, auth.tenantId, data);

  if (!team) {
    throw new HTTPException(404, { message: 'Team not found' });
  }

  return c.json(team);
});

// Delete team
teamsRoutes.delete('/:id', async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');

  const team = await teamsService.delete(id, auth.tenantId);

  if (!team) {
    throw new HTTPException(404, { message: 'Team not found' });
  }

  return c.json({ message: 'Team deleted' });
});

// Get team members
teamsRoutes.get('/:id/members', async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');

  // Verify team exists
  const team = await teamsService.findById(id, auth.tenantId);
  if (!team) {
    throw new HTTPException(404, { message: 'Team not found' });
  }

  const members = await teamsService.getMembers(id);

  return c.json({ members });
});

// Add member to team
teamsRoutes.post(
  '/:id/members',
  zValidator('json', addMemberSchema),
  async (c) => {
    const auth = c.get('auth');
    const id = c.req.param('id');
    const { userId } = c.req.valid('json');

    // Verify team exists
    const team = await teamsService.findById(id, auth.tenantId);
    if (!team) {
      throw new HTTPException(404, { message: 'Team not found' });
    }

    const membership = await teamsService.addMember(id, userId);

    return c.json(membership, 201);
  }
);

// Remove member from team
teamsRoutes.delete('/:id/members/:userId', async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');
  const userId = c.req.param('userId');

  // Verify team exists
  const team = await teamsService.findById(id, auth.tenantId);
  if (!team) {
    throw new HTTPException(404, { message: 'Team not found' });
  }

  const membership = await teamsService.removeMember(id, userId);

  if (!membership) {
    throw new HTTPException(404, { message: 'Member not found in team' });
  }

  return c.json({ message: 'Member removed from team' });
});

export { teamsRoutes };
