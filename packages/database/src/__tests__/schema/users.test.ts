import { describe, expect, it } from 'vitest';
import { userRoleEnum, users, usersRelations, type NewUser, type User } from '../../schema/users';

describe('users schema', () => {
  describe('table definition', () => {
    it('should have id column', () => {
      expect(users.id).toBeDefined();
      expect(users.id.name).toBe('id');
    });

    it('should have tenantId as required foreign key', () => {
      expect(users.tenantId).toBeDefined();
      expect(users.tenantId.name).toBe('tenant_id');
      expect(users.tenantId.notNull).toBe(true);
    });

    it('should have email as unique required field', () => {
      expect(users.email).toBeDefined();
      expect(users.email.name).toBe('email');
      expect(users.email.notNull).toBe(true);
      expect(users.email.isUnique).toBe(true);
    });

    it('should have passwordHash as optional field', () => {
      expect(users.passwordHash).toBeDefined();
      expect(users.passwordHash.name).toBe('password_hash');
      expect(users.passwordHash.notNull).toBe(false);
    });

    it('should have name as required field', () => {
      expect(users.name).toBeDefined();
      expect(users.name.name).toBe('name');
      expect(users.name.notNull).toBe(true);
    });

    it('should have role with default value', () => {
      expect(users.role).toBeDefined();
      expect(users.role.name).toBe('role');
      expect(users.role.notNull).toBe(true);
      expect(users.role.hasDefault).toBe(true);
    });

    it('should have isActive with default', () => {
      expect(users.isActive).toBeDefined();
      expect(users.isActive.name).toBe('is_active');
      expect(users.isActive.notNull).toBe(true);
      expect(users.isActive.hasDefault).toBe(true);
    });

    it('should have optional timestamp fields', () => {
      expect(users.emailVerifiedAt.name).toBe('email_verified_at');
      expect(users.emailVerifiedAt.notNull).toBe(false);
      expect(users.lastSeenAt.name).toBe('last_seen_at');
      expect(users.lastSeenAt.notNull).toBe(false);
    });

    it('should have required timestamp fields', () => {
      expect(users.createdAt.name).toBe('created_at');
      expect(users.createdAt.notNull).toBe(true);
      expect(users.updatedAt.name).toBe('updated_at');
      expect(users.updatedAt.notNull).toBe(true);
    });
  });

  describe('userRoleEnum', () => {
    it('should have all expected role types', () => {
      const values = userRoleEnum.enumValues;
      expect(values).toContain('owner');
      expect(values).toContain('admin');
      expect(values).toContain('agent');
      expect(values).toHaveLength(3);
    });
  });

  describe('relations', () => {
    it('should define relations', () => {
      expect(usersRelations).toBeDefined();
    });
  });

  describe('type inference', () => {
    it('should correctly type User select type', () => {
      const user: User = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        tenantId: '223e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        passwordHash: 'hashedpassword',
        name: 'Test User',
        avatarUrl: null,
        role: 'agent',
        isActive: true,
        emailVerifiedAt: null,
        lastSeenAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      expect(user).toBeDefined();
      expect(user.email).toBe('test@example.com');
    });

    it('should correctly type NewUser insert type with minimal fields', () => {
      const newUser: NewUser = {
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        email: 'new@example.com',
        name: 'New User',
      };
      expect(newUser).toBeDefined();
      expect(newUser.email).toBe('new@example.com');
    });

    it('should correctly type NewUser insert type with all fields', () => {
      const fullUser: NewUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        tenantId: '223e4567-e89b-12d3-a456-426614174000',
        email: 'full@example.com',
        passwordHash: 'hashedpassword',
        name: 'Full User',
        avatarUrl: 'https://example.com/avatar.png',
        role: 'admin',
        isActive: false,
        emailVerifiedAt: new Date(),
        lastSeenAt: new Date(),
      };
      expect(fullUser).toBeDefined();
      expect(fullUser.role).toBe('admin');
    });
  });
});
