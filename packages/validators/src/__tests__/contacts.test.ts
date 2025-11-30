import { describe, expect, it } from 'vitest';
import { createContactSchema, updateContactSchema, importContactsSchema } from '../index';

describe('Contact Schemas', () => {
  describe('createContactSchema', () => {
    it('should accept valid contact with all fields', () => {
      const result = createContactSchema.parse({
        name: 'John Doe',
        phone: '+5511999999999',
        email: 'john@example.com',
        tags: ['vip', 'lead'],
        customFields: { company: 'Acme Inc' },
      });
      expect(result.name).toBe('John Doe');
      expect(result.phone).toBe('+5511999999999');
      expect(result.email).toBe('john@example.com');
      expect(result.tags).toEqual(['vip', 'lead']);
      expect(result.customFields).toEqual({ company: 'Acme Inc' });
    });

    it('should accept contact with only required fields', () => {
      const result = createContactSchema.parse({
        name: 'Jane Doe',
      });
      expect(result.name).toBe('Jane Doe');
      expect(result.phone).toBeUndefined();
      expect(result.email).toBeUndefined();
      expect(result.tags).toEqual([]);
      expect(result.customFields).toEqual({});
    });

    it('should reject empty name', () => {
      expect(() =>
        createContactSchema.parse({
          name: '',
        }),
      ).toThrow('Nome é obrigatório');
    });

    it('should accept valid phone formats', () => {
      const validPhones = [
        '+5511999999999',
        '+14155551234',
        '+442071234567',
        '5511999999999',
      ];
      for (const phone of validPhones) {
        const result = createContactSchema.parse({ name: 'Test', phone });
        expect(result.phone).toBe(phone);
      }
    });

    it('should reject invalid phone formats', () => {
      const invalidPhones = [
        '999999999', // too short
        '+0123456789012', // starts with 0
        'abc123', // contains letters
        '+123', // too short
      ];
      for (const phone of invalidPhones) {
        expect(() =>
          createContactSchema.parse({ name: 'Test', phone }),
        ).toThrow('Telefone inválido');
      }
    });

    it('should accept null phone and email', () => {
      const result = createContactSchema.parse({
        name: 'Test',
        phone: null,
        email: null,
      });
      expect(result.phone).toBeNull();
      expect(result.email).toBeNull();
    });

    it('should reject invalid email', () => {
      expect(() =>
        createContactSchema.parse({
          name: 'Test',
          email: 'not-an-email',
        }),
      ).toThrow('Email inválido');
    });

    it('should accept empty tags array', () => {
      const result = createContactSchema.parse({
        name: 'Test',
        tags: [],
      });
      expect(result.tags).toEqual([]);
    });

    it('should accept complex customFields', () => {
      const customFields = {
        company: 'Acme',
        revenue: 1000000,
        active: true,
        nested: { key: 'value' },
      };
      const result = createContactSchema.parse({
        name: 'Test',
        customFields,
      });
      expect(result.customFields).toEqual(customFields);
    });
  });

  describe('updateContactSchema', () => {
    it('should accept partial update with only name', () => {
      const result = updateContactSchema.parse({
        name: 'Updated Name',
      });
      expect(result.name).toBe('Updated Name');
    });

    it('should accept partial update with only phone', () => {
      const result = updateContactSchema.parse({
        phone: '+5511888888888',
      });
      expect(result.phone).toBe('+5511888888888');
    });

    it('should accept empty object (no updates)', () => {
      const result = updateContactSchema.parse({});
      expect(result).toEqual({});
    });

    it('should still validate phone format when provided', () => {
      expect(() =>
        updateContactSchema.parse({
          phone: 'invalid',
        }),
      ).toThrow('Telefone inválido');
    });
  });

  describe('importContactsSchema', () => {
    const validContact = { name: 'John Doe', phone: '+5511999999999' };

    it('should accept valid import with single contact', () => {
      const result = importContactsSchema.parse({
        contacts: [validContact],
      });
      expect(result.contacts).toHaveLength(1);
      expect(result.skipDuplicates).toBe(true);
    });

    it('should accept import with multiple contacts', () => {
      const result = importContactsSchema.parse({
        contacts: [
          validContact,
          { name: 'Jane Doe', email: 'jane@example.com' },
        ],
      });
      expect(result.contacts).toHaveLength(2);
    });

    it('should accept import with tags', () => {
      const result = importContactsSchema.parse({
        contacts: [validContact],
        tags: ['imported', 'batch-1'],
      });
      expect(result.tags).toEqual(['imported', 'batch-1']);
    });

    it('should accept skipDuplicates false', () => {
      const result = importContactsSchema.parse({
        contacts: [validContact],
        skipDuplicates: false,
      });
      expect(result.skipDuplicates).toBe(false);
    });

    it('should reject empty contacts array', () => {
      expect(() =>
        importContactsSchema.parse({
          contacts: [],
        }),
      ).toThrow();
    });

    it('should reject more than 10000 contacts', () => {
      const contacts = Array.from({ length: 10001 }, (_, i) => ({
        name: `Contact ${i}`,
      }));
      expect(() =>
        importContactsSchema.parse({
          contacts,
        }),
      ).toThrow();
    });

    it('should validate each contact in the array', () => {
      expect(() =>
        importContactsSchema.parse({
          contacts: [{ name: '' }],
        }),
      ).toThrow('Nome é obrigatório');
    });
  });
});
