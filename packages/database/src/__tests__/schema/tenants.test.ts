import { describe, expect, it } from 'vitest';
import { planEnum, tenants, type NewTenant, type Tenant } from '../../schema/tenants';

describe('tenants schema', () => {
  describe('table definition', () => {
    it('should have id column', () => {
      expect(tenants.id).toBeDefined();
      expect(tenants.id.name).toBe('id');
    });

    it('should have name as required text field', () => {
      expect(tenants.name).toBeDefined();
      expect(tenants.name.name).toBe('name');
      expect(tenants.name.notNull).toBe(true);
    });

    it('should have slug as unique text field', () => {
      expect(tenants.slug).toBeDefined();
      expect(tenants.slug.name).toBe('slug');
      expect(tenants.slug.notNull).toBe(true);
      expect(tenants.slug.isUnique).toBe(true);
    });

    it('should have plan with default value', () => {
      expect(tenants.plan).toBeDefined();
      expect(tenants.plan.name).toBe('plan');
      expect(tenants.plan.notNull).toBe(true);
      expect(tenants.plan.hasDefault).toBe(true);
    });

    it('should have logoUrl as optional text field', () => {
      expect(tenants.logoUrl).toBeDefined();
      expect(tenants.logoUrl.name).toBe('logo_url');
      expect(tenants.logoUrl.notNull).toBe(false);
    });

    it('should have settings as jsonb with default', () => {
      expect(tenants.settings).toBeDefined();
      expect(tenants.settings.name).toBe('settings');
      expect(tenants.settings.notNull).toBe(true);
      expect(tenants.settings.hasDefault).toBe(true);
    });

    it('should have timestamp fields', () => {
      expect(tenants.createdAt.name).toBe('created_at');
      expect(tenants.createdAt.notNull).toBe(true);
      expect(tenants.updatedAt.name).toBe('updated_at');
      expect(tenants.updatedAt.notNull).toBe(true);
    });
  });

  describe('planEnum', () => {
    it('should have all expected plan types', () => {
      const values = planEnum.enumValues;
      expect(values).toContain('free');
      expect(values).toContain('starter');
      expect(values).toContain('pro');
      expect(values).toContain('enterprise');
      expect(values).toHaveLength(4);
    });
  });

  describe('type inference', () => {
    it('should correctly type Tenant select type', () => {
      const tenant: Tenant = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Tenant',
        slug: 'test-tenant',
        plan: 'free',
        logoUrl: null,
        settings: { timezone: 'America/Sao_Paulo', businessHours: { enabled: false, schedule: {} }, autoAssignment: false },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      expect(tenant).toBeDefined();
      expect(tenant.id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(tenant.plan).toBe('free');
    });

    it('should correctly type NewTenant insert type with minimal fields', () => {
      const newTenant: NewTenant = {
        name: 'New Tenant',
        slug: 'new-tenant',
      };
      expect(newTenant).toBeDefined();
      expect(newTenant.name).toBe('New Tenant');
    });

    it('should correctly type NewTenant insert type with all fields', () => {
      const fullTenant: NewTenant = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Full Tenant',
        slug: 'full-tenant',
        plan: 'pro',
        logoUrl: 'https://example.com/logo.png',
        settings: { timezone: 'UTC', businessHours: { enabled: true, schedule: {} }, autoAssignment: true },
      };
      expect(fullTenant).toBeDefined();
      expect(fullTenant.plan).toBe('pro');
    });
  });
});
