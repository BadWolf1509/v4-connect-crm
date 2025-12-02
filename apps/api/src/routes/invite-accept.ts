import { zValidator } from '@hono/zod-validator';
import * as bcrypt from 'bcryptjs';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import type { AppType } from '../middleware/auth';
import { emailService } from '../services/email.service';
import { invitesService } from '../services/invites.service';
import { tenantsService } from '../services/tenants.service';
import { usersService } from '../services/users.service';

const inviteAcceptRoutes = new Hono<AppType>();

const acceptInviteSchema = z.object({
  name: z.string().min(2),
  password: z.string().min(8),
});

// Get invite details by token (public)
inviteAcceptRoutes.get('/:token', async (c) => {
  const token = c.req.param('token');

  const result = await invitesService.findByToken(token);

  if (!result) {
    throw new HTTPException(404, { message: 'Invite not found' });
  }

  const { invite, tenant } = result;

  if (invitesService.isExpired(invite)) {
    throw new HTTPException(400, { message: 'Invite has expired or is no longer valid' });
  }

  return c.json({
    email: invite.email,
    role: invite.role,
    tenant: tenant
      ? {
          name: tenant.name,
          slug: tenant.slug,
        }
      : null,
    expiresAt: invite.expiresAt,
  });
});

// Accept invite and create user account (public)
inviteAcceptRoutes.post('/:token/accept', zValidator('json', acceptInviteSchema), async (c) => {
  const token = c.req.param('token');
  const data = c.req.valid('json');

  const result = await invitesService.findByToken(token);

  if (!result) {
    throw new HTTPException(404, { message: 'Invite not found' });
  }

  const { invite } = result;

  if (invitesService.isExpired(invite)) {
    throw new HTTPException(400, { message: 'Invite has expired or is no longer valid' });
  }

  // Check if user already exists
  const existingUser = await usersService.findByEmail(invite.email);
  if (existingUser) {
    throw new HTTPException(400, { message: 'An account with this email already exists' });
  }

  // Hash the password
  const passwordHash = await bcrypt.hash(data.password, 12);

  // Create the user
  const user = await usersService.create({
    tenantId: invite.tenantId,
    email: invite.email,
    name: data.name,
    passwordHash,
    role: invite.role,
  });

  if (!user) {
    throw new HTTPException(500, { message: 'Failed to create user account' });
  }

  // Mark invite as accepted
  await invitesService.accept(token, user.id);

  // Send welcome email
  const tenant = await tenantsService.findById(invite.tenantId);
  await emailService.sendWelcome({
    email: user.email,
    userName: user.name,
    tenantName: tenant?.name || 'V4 Connect',
  });

  return c.json({
    success: true,
    message: 'Account created successfully. You can now login.',
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  });
});

export { inviteAcceptRoutes };
