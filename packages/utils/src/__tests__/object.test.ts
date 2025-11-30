import { describe, expect, it } from 'vitest';
import { omit, pick, isEmpty } from '../index';

describe('Object Utils', () => {
  describe('omit', () => {
    it('should omit specified keys', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = omit(obj, ['b']);
      expect(result).toEqual({ a: 1, c: 3 });
    });

    it('should omit multiple keys', () => {
      const obj = { a: 1, b: 2, c: 3, d: 4 };
      const result = omit(obj, ['a', 'c']);
      expect(result).toEqual({ b: 2, d: 4 });
    });

    it('should return same object if no keys to omit', () => {
      const obj = { a: 1, b: 2 };
      const result = omit(obj, []);
      expect(result).toEqual({ a: 1, b: 2 });
    });

    it('should not modify original object', () => {
      const obj = { a: 1, b: 2 };
      omit(obj, ['a']);
      expect(obj).toEqual({ a: 1, b: 2 });
    });

    it('should handle non-existent keys', () => {
      const obj = { a: 1, b: 2 };
      const result = omit(obj, ['c' as keyof typeof obj]);
      expect(result).toEqual({ a: 1, b: 2 });
    });

    it('should work with nested objects', () => {
      const obj = { a: 1, b: { nested: true }, c: 3 };
      const result = omit(obj, ['b']);
      expect(result).toEqual({ a: 1, c: 3 });
    });
  });

  describe('pick', () => {
    it('should pick specified keys', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = pick(obj, ['a', 'c']);
      expect(result).toEqual({ a: 1, c: 3 });
    });

    it('should pick single key', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = pick(obj, ['b']);
      expect(result).toEqual({ b: 2 });
    });

    it('should return empty object if no keys to pick', () => {
      const obj = { a: 1, b: 2 };
      const result = pick(obj, []);
      expect(result).toEqual({});
    });

    it('should not modify original object', () => {
      const obj = { a: 1, b: 2, c: 3 };
      pick(obj, ['a']);
      expect(obj).toEqual({ a: 1, b: 2, c: 3 });
    });

    it('should ignore non-existent keys', () => {
      const obj = { a: 1, b: 2 };
      const result = pick(obj, ['a', 'c' as keyof typeof obj]);
      expect(result).toEqual({ a: 1 });
    });

    it('should work with nested objects', () => {
      const obj = { a: 1, b: { nested: true }, c: 3 };
      const result = pick(obj, ['b']);
      expect(result).toEqual({ b: { nested: true } });
    });
  });

  describe('isEmpty', () => {
    it('should return true for null', () => {
      expect(isEmpty(null)).toBe(true);
    });

    it('should return true for undefined', () => {
      expect(isEmpty(undefined)).toBe(true);
    });

    it('should return true for empty string', () => {
      expect(isEmpty('')).toBe(true);
    });

    it('should return true for whitespace-only string', () => {
      expect(isEmpty('   ')).toBe(true);
      expect(isEmpty('\t\n')).toBe(true);
    });

    it('should return false for non-empty string', () => {
      expect(isEmpty('hello')).toBe(false);
      expect(isEmpty(' hello ')).toBe(false);
    });

    it('should return true for empty array', () => {
      expect(isEmpty([])).toBe(true);
    });

    it('should return false for non-empty array', () => {
      expect(isEmpty([1])).toBe(false);
      expect(isEmpty([null])).toBe(false);
    });

    it('should return true for empty object', () => {
      expect(isEmpty({})).toBe(true);
    });

    it('should return false for non-empty object', () => {
      expect(isEmpty({ a: 1 })).toBe(false);
      expect(isEmpty({ a: undefined })).toBe(false);
    });

    it('should return false for numbers', () => {
      expect(isEmpty(0)).toBe(false);
      expect(isEmpty(1)).toBe(false);
    });

    it('should return false for booleans', () => {
      expect(isEmpty(false)).toBe(false);
      expect(isEmpty(true)).toBe(false);
    });
  });
});
