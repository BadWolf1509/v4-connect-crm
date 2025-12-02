import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { type AppType, requireAuth } from '../middleware/auth';
import { emailService } from '../services/email.service';
import { invitesService } from '../services/invites.service';
import { tenantsService } from '../services/tenants.service';
import { usersService } from '../services/users.service';

const invitesRoutes = new Hono<AppType>();

invitesRoutes.use('*', requireAuth);

const createInviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['owner', 'admin', 'agent']).default('agent'),
});

const _resendInviteSchema = z.object({
  id: z.string().uuid(),
});

// List all invites for tenant
invitesRoutes.get('/', async (c) => {
  const auth = c.get('auth');
  const result = await invitesService.findAll(auth.tenantId);
  return c.json(result);
});

// Get invite by ID
invitesRoutes.get('/:id', async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');

  const invite = await invitesService.findById(id, auth.tenantId);

  if (!invite) {
    throw new HTTPException(404, { message: 'Invite not found' });
  }

  return c.json(invite);
});

// Create new invite
invitesRoutes.post('/', zValidator('json', createInviteSchema), async (c) => {
  const auth = c.get('auth');
  const data = c.req.valid('json');

  // Check if user already exists in tenant
  const existingUser = await usersService.findByEmail(data.email);
  if (existingUser && existingUser.tenantId === auth.tenantId) {
    throw new HTTPException(400, { message: 'User already exists in this tenant' });
  }

  // Check if there's already a pending invite
  const existingInvite = await invitesService.findPendingByEmail(data.email, auth.tenantId);
  if (existingInvite) {
    throw new HTTPException(400, { message: 'An invite is already pending for this email' });
  }

  // Get inviter and tenant info for the email
  const inviter = await usersService.findById(auth.userId, auth.tenantId);
  const tenant = await tenantsService.findById(auth.tenantId);

  const invite = await invitesService.create({
    tenantId: auth.tenantId,
    email: data.email,
    role: data.role,
    invitedById: auth.userId,
  });

  if (!invite) {
    throw new HTTPException(500, { message: 'Failed to create invite' });
  }

  // Send invite email
  const emailResult = await emailService.sendInvite({
    email: data.email,
    token: invite.token,
    inviterName: inviter?.name || 'Um membro',
    tenantName: tenant?.name || 'V4 Connect',
    role: data.role,
  });

  const inviteUrl = `${process.env.WEB_URL || 'http://localhost:3002'}/invite/${invite.token}`;

  return c.json(
    {
      invite,
      inviteUrl,
      emailSent: emailResult.success,
    },
    201,
  );
});

// Resend invite (regenerate token and extend expiration)
invitesRoutes.post('/:id/resend', async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');

  const invite = await invitesService.resend(id, auth.tenantId);

  if (!invite) {
    throw new HTTPException(404, { message: 'Invite not found or not pending' });
  }

  // Get inviter and tenant info for the email
  const inviter = await usersService.findById(auth.userId, auth.tenantId);
  const tenant = await tenantsService.findById(auth.tenantId);

  // Send invite email
  const emailResult = await emailService.sendInvite({
    email: invite.email,
    token: invite.token,
    inviterName: inviter?.name || 'Um membro',
    tenantName: tenant?.name || 'V4 Connect',
    role: invite.role,
  });

  const inviteUrl = `${process.env.WEB_URL || 'http://localhost:3002'}/invite/${invite.token}`;

  return c.json({
    invite,
    inviteUrl,
    emailSent: emailResult.success,
  });
});

// Revoke invite
invitesRoutes.delete('/:id', async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');

  const invite = await invitesService.revoke(id, auth.tenantId);

  if (!invite) {
    throw new HTTPException(404, { message: 'Invite not found or not pending' });
  }

  return c.json({ success: true });
});

export { invitesRoutes };
