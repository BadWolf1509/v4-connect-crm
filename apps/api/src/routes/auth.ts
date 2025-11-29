import { zValidator } from '@hono/zod-validator';
import * as bcrypt from 'bcryptjs';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { type AppType, requireAuth } from '../middleware/auth';
import { tenantsService } from '../services/tenants.service';
import { usersService } from '../services/users.service';

const authRoutes = new Hono<AppType>();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  company: z.string().min(2),
});

// Login - validate credentials
authRoutes.post('/login', zValidator('json', loginSchema), async (c) => {
  const { email, password } = c.req.valid('json');

  // Find user by email
  const user = await usersService.findByEmail(email);

  if (!user) {
    throw new HTTPException(401, { message: 'Invalid credentials' });
  }

  if (!user.isActive) {
    throw new HTTPException(401, { message: 'Account is deactivated' });
  }

  if (!user.passwordHash) {
    throw new HTTPException(401, { message: 'Invalid credentials' });
  }

  // Verify password
  const isValidPassword = await bcrypt.compare(password, user.passwordHash);

  if (!isValidPassword) {
    throw new HTTPException(401, { message: 'Invalid credentials' });
  }

  // Update last seen
  await usersService.updateLastSeen(user.id);

  // Return user data (without password hash)
  return c.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatarUrl: user.avatarUrl,
      tenantId: user.tenantId,
      tenant: user.tenant,
    },
  });
});

// Register - create tenant and user
authRoutes.post('/register', zValidator('json', registerSchema), async (c) => {
  const { name, email, password, company } = c.req.valid('json');

  // Check if email already exists
  const existingUser = await usersService.findByEmail(email);
  if (existingUser) {
    throw new HTTPException(409, { message: 'Email already registered' });
  }

  // Generate tenant slug
  const slug = await tenantsService.generateSlug(company);

  // Create tenant
  const tenant = await tenantsService.create({
    name: company,
    slug,
    plan: 'free',
  });

  // Hash password
  const passwordHash = await bcrypt.hash(password, 12);

  // Create user as owner
  const user = await usersService.create({
    tenantId: tenant.id,
    email,
    passwordHash,
    name,
    role: 'owner',
  });

  return c.json(
    {
      message: 'Registration successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
        },
      },
    },
    201,
  );
});

// Get current user (requires auth)
authRoutes.get('/me', requireAuth, async (c) => {
  const auth = c.get('auth');

  const user = await usersService.findById(auth.userId, auth.tenantId);

  if (!user) {
    throw new HTTPException(404, { message: 'User not found' });
  }

  return c.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    avatarUrl: user.avatarUrl,
    tenantId: user.tenantId,
    isActive: user.isActive,
    lastSeenAt: user.lastSeenAt,
    createdAt: user.createdAt,
  });
});

// Change password
authRoutes.post('/change-password', requireAuth, async (c) => {
  const auth = c.get('auth');
  const { currentPassword, newPassword } = await c.req.json();

  if (!currentPassword || !newPassword || newPassword.length < 8) {
    throw new HTTPException(400, { message: 'Invalid password' });
  }

  // Get user with password hash
  const user = await usersService.findByEmail(auth.userId);

  if (!user || !user.passwordHash) {
    throw new HTTPException(404, { message: 'User not found' });
  }

  // Verify current password
  const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);

  if (!isValidPassword) {
    throw new HTTPException(401, { message: 'Current password is incorrect' });
  }

  // Hash new password
  const passwordHash = await bcrypt.hash(newPassword, 12);

  // Update password
  await usersService.update(user.id, user.tenantId, { passwordHash });

  return c.json({ message: 'Password changed successfully' });
});

export { authRoutes };
