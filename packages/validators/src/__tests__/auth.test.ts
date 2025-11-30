import { describe, expect, it } from 'vitest';
import { loginSchema, registerSchema, inviteUserSchema } from '../index';

describe('Auth Schemas', () => {
  describe('loginSchema', () => {
    it('should accept valid login credentials', () => {
      const result = loginSchema.parse({
        email: 'user@example.com',
        password: 'password123',
      });
      expect(result.email).toBe('user@example.com');
      expect(result.password).toBe('password123');
    });

    it('should reject invalid email', () => {
      expect(() =>
        loginSchema.parse({
          email: 'invalid-email',
          password: 'password123',
        }),
      ).toThrow('Email inválido');
    });

    it('should reject email without domain', () => {
      expect(() =>
        loginSchema.parse({
          email: 'user@',
          password: 'password123',
        }),
      ).toThrow();
    });

    it('should reject password shorter than 8 characters', () => {
      expect(() =>
        loginSchema.parse({
          email: 'user@example.com',
          password: '1234567',
        }),
      ).toThrow('Senha deve ter no mínimo 8 caracteres');
    });

    it('should accept password with exactly 8 characters', () => {
      const result = loginSchema.parse({
        email: 'user@example.com',
        password: '12345678',
      });
      expect(result.password).toBe('12345678');
    });

    it('should reject missing email', () => {
      expect(() =>
        loginSchema.parse({
          password: 'password123',
        }),
      ).toThrow();
    });

    it('should reject missing password', () => {
      expect(() =>
        loginSchema.parse({
          email: 'user@example.com',
        }),
      ).toThrow();
    });
  });

  describe('registerSchema', () => {
    const validData = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'Password1',
      tenantName: 'My Company',
    };

    it('should accept valid registration data', () => {
      const result = registerSchema.parse(validData);
      expect(result.name).toBe('John Doe');
      expect(result.email).toBe('john@example.com');
      expect(result.password).toBe('Password1');
      expect(result.tenantName).toBe('My Company');
    });

    it('should reject name shorter than 2 characters', () => {
      expect(() =>
        registerSchema.parse({
          ...validData,
          name: 'J',
        }),
      ).toThrow('Nome deve ter no mínimo 2 caracteres');
    });

    it('should reject invalid email', () => {
      expect(() =>
        registerSchema.parse({
          ...validData,
          email: 'not-an-email',
        }),
      ).toThrow('Email inválido');
    });

    it('should reject password without uppercase letter', () => {
      expect(() =>
        registerSchema.parse({
          ...validData,
          password: 'password1',
        }),
      ).toThrow('Senha deve ter ao menos uma letra maiúscula');
    });

    it('should reject password without number', () => {
      expect(() =>
        registerSchema.parse({
          ...validData,
          password: 'Password',
        }),
      ).toThrow('Senha deve ter ao menos um número');
    });

    it('should reject password shorter than 8 characters', () => {
      expect(() =>
        registerSchema.parse({
          ...validData,
          password: 'Pass1',
        }),
      ).toThrow('Senha deve ter no mínimo 8 caracteres');
    });

    it('should reject tenantName shorter than 2 characters', () => {
      expect(() =>
        registerSchema.parse({
          ...validData,
          tenantName: 'A',
        }),
      ).toThrow('Nome da empresa deve ter no mínimo 2 caracteres');
    });

    it('should accept complex password with special characters', () => {
      const result = registerSchema.parse({
        ...validData,
        password: 'Password1!@#$%',
      });
      expect(result.password).toBe('Password1!@#$%');
    });
  });

  describe('inviteUserSchema', () => {
    it('should accept valid invite with admin role', () => {
      const result = inviteUserSchema.parse({
        email: 'newuser@example.com',
        role: 'admin',
      });
      expect(result.email).toBe('newuser@example.com');
      expect(result.role).toBe('admin');
    });

    it('should accept valid invite with agent role', () => {
      const result = inviteUserSchema.parse({
        email: 'agent@example.com',
        role: 'agent',
      });
      expect(result.role).toBe('agent');
    });

    it('should accept invite with teamIds', () => {
      const teamId = '550e8400-e29b-41d4-a716-446655440000';
      const result = inviteUserSchema.parse({
        email: 'user@example.com',
        role: 'agent',
        teamIds: [teamId],
      });
      expect(result.teamIds).toEqual([teamId]);
    });

    it('should allow teamIds to be undefined', () => {
      const result = inviteUserSchema.parse({
        email: 'user@example.com',
        role: 'admin',
      });
      expect(result.teamIds).toBeUndefined();
    });

    it('should reject invalid role', () => {
      expect(() =>
        inviteUserSchema.parse({
          email: 'user@example.com',
          role: 'owner',
        }),
      ).toThrow();
    });

    it('should reject invalid email', () => {
      expect(() =>
        inviteUserSchema.parse({
          email: 'invalid',
          role: 'admin',
        }),
      ).toThrow('Email inválido');
    });

    it('should reject invalid UUID in teamIds', () => {
      expect(() =>
        inviteUserSchema.parse({
          email: 'user@example.com',
          role: 'agent',
          teamIds: ['not-a-uuid'],
        }),
      ).toThrow();
    });
  });
});
