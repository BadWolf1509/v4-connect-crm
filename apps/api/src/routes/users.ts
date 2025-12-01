import { Hono } from 'hono';
import { type AppType, requireAuth } from '../middleware/auth';
import { usersService } from '../services/users.service';

const usersRoutes = new Hono<AppType>();

usersRoutes.use('*', requireAuth);

// List all users in tenant
usersRoutes.get('/', async (c) => {
  const auth = c.get('auth');
  const result = await usersService.findAll(auth.tenantId);
  return c.json(result);
});

// Get user by ID
usersRoutes.get('/:id', async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');
  const user = await usersService.findById(id, auth.tenantId);

  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  return c.json(user);
});

export { usersRoutes };
