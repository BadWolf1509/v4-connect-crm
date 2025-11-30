import { describe, expect, it } from 'vitest';
import { idSchema, paginationSchema, sortSchema } from '../index';

describe('Common Schemas', () => {
  describe('idSchema', () => {
    it('should accept valid UUID', () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      expect(idSchema.parse(validUuid)).toBe(validUuid);
    });

    it('should reject invalid UUID', () => {
      expect(() => idSchema.parse('not-a-uuid')).toThrow();
      expect(() => idSchema.parse('123')).toThrow();
      expect(() => idSchema.parse('')).toThrow();
    });

    it('should reject non-string values', () => {
      expect(() => idSchema.parse(123)).toThrow();
      expect(() => idSchema.parse(null)).toThrow();
      expect(() => idSchema.parse(undefined)).toThrow();
    });
  });

  describe('paginationSchema', () => {
    it('should accept valid pagination params', () => {
      const result = paginationSchema.parse({ page: 2, pageSize: 50 });
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(50);
    });

    it('should use default values when not provided', () => {
      const result = paginationSchema.parse({});
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });

    it('should coerce string numbers', () => {
      const result = paginationSchema.parse({ page: '3', pageSize: '25' });
      expect(result.page).toBe(3);
      expect(result.pageSize).toBe(25);
    });

    it('should reject page less than 1', () => {
      expect(() => paginationSchema.parse({ page: 0 })).toThrow();
      expect(() => paginationSchema.parse({ page: -1 })).toThrow();
    });

    it('should reject pageSize greater than 100', () => {
      expect(() => paginationSchema.parse({ pageSize: 101 })).toThrow();
      expect(() => paginationSchema.parse({ pageSize: 1000 })).toThrow();
    });

    it('should reject pageSize less than 1', () => {
      expect(() => paginationSchema.parse({ pageSize: 0 })).toThrow();
      expect(() => paginationSchema.parse({ pageSize: -1 })).toThrow();
    });

    it('should reject non-integer values', () => {
      expect(() => paginationSchema.parse({ page: 1.5 })).toThrow();
      expect(() => paginationSchema.parse({ pageSize: 10.5 })).toThrow();
    });
  });

  describe('sortSchema', () => {
    it('should accept valid sort params', () => {
      const result = sortSchema.parse({ sortBy: 'createdAt', sortOrder: 'asc' });
      expect(result.sortBy).toBe('createdAt');
      expect(result.sortOrder).toBe('asc');
    });

    it('should use default sortOrder when not provided', () => {
      const result = sortSchema.parse({ sortBy: 'name' });
      expect(result.sortOrder).toBe('desc');
    });

    it('should allow sortBy to be undefined', () => {
      const result = sortSchema.parse({});
      expect(result.sortBy).toBeUndefined();
      expect(result.sortOrder).toBe('desc');
    });

    it('should reject invalid sortOrder', () => {
      expect(() => sortSchema.parse({ sortOrder: 'invalid' })).toThrow();
      expect(() => sortSchema.parse({ sortOrder: 'ASC' })).toThrow();
    });
  });
});
