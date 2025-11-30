import { describe, expect, it } from 'vitest';
import {
  slugify,
  truncate,
  capitalize,
  formatPhoneNumber,
  normalizePhoneNumber,
} from '../index';

describe('String Utils', () => {
  describe('slugify', () => {
    it('should convert text to lowercase slug', () => {
      expect(slugify('Hello World')).toBe('hello-world');
    });

    it('should remove diacritics', () => {
      expect(slugify('Café com Pão')).toBe('cafe-com-pao');
      expect(slugify('São Paulo')).toBe('sao-paulo');
      expect(slugify('Ação Rápida')).toBe('acao-rapida');
    });

    it('should replace special characters with hyphens', () => {
      expect(slugify('Hello@World!')).toBe('hello-world');
      expect(slugify('Price: $100')).toBe('price-100');
    });

    it('should remove leading and trailing hyphens', () => {
      expect(slugify('---Hello---')).toBe('hello');
      expect(slugify('  Hello  ')).toBe('hello');
    });

    it('should collapse multiple hyphens', () => {
      expect(slugify('Hello   World')).toBe('hello-world');
      expect(slugify('Hello---World')).toBe('hello-world');
    });

    it('should handle empty string', () => {
      expect(slugify('')).toBe('');
    });

    it('should handle numbers', () => {
      expect(slugify('Product 123')).toBe('product-123');
    });
  });

  describe('truncate', () => {
    it('should truncate text longer than limit', () => {
      expect(truncate('Hello World', 8)).toBe('Hello...');
    });

    it('should not truncate text shorter than limit', () => {
      expect(truncate('Hello', 10)).toBe('Hello');
    });

    it('should not truncate text equal to limit', () => {
      expect(truncate('Hello', 5)).toBe('Hello');
    });

    it('should use custom suffix', () => {
      expect(truncate('Hello World', 8, '…')).toBe('Hello W…');
    });

    it('should handle empty string', () => {
      expect(truncate('', 10)).toBe('');
    });

    it('should handle very short limit', () => {
      expect(truncate('Hello', 3)).toBe('...');
    });
  });

  describe('capitalize', () => {
    it('should capitalize first letter', () => {
      expect(capitalize('hello')).toBe('Hello');
    });

    it('should lowercase the rest', () => {
      expect(capitalize('HELLO')).toBe('Hello');
      expect(capitalize('hELLO')).toBe('Hello');
    });

    it('should handle single character', () => {
      expect(capitalize('h')).toBe('H');
    });

    it('should handle empty string', () => {
      expect(capitalize('')).toBe('');
    });

    it('should handle already capitalized', () => {
      expect(capitalize('Hello')).toBe('Hello');
    });
  });

  describe('formatPhoneNumber', () => {
    it('should format 11-digit Brazilian mobile', () => {
      expect(formatPhoneNumber('11999999999')).toBe('(11) 99999-9999');
    });

    it('should format 13-digit with country code', () => {
      expect(formatPhoneNumber('5511999999999')).toBe('+55 (11) 99999-9999');
    });

    it('should return original for unknown format', () => {
      expect(formatPhoneNumber('123456')).toBe('123456');
    });

    it('should strip non-numeric characters before formatting', () => {
      expect(formatPhoneNumber('(11) 99999-9999')).toBe('(11) 99999-9999');
    });

    it('should handle international format with plus', () => {
      expect(formatPhoneNumber('+5511999999999')).toBe('+55 (11) 99999-9999');
    });
  });

  describe('normalizePhoneNumber', () => {
    it('should add country code to 11-digit number', () => {
      expect(normalizePhoneNumber('11999999999')).toBe('5511999999999');
    });

    it('should add country code to 10-digit number', () => {
      expect(normalizePhoneNumber('1199999999')).toBe('551199999999');
    });

    it('should remove leading zero and add country code', () => {
      expect(normalizePhoneNumber('01199999999')).toBe('551199999999');
    });

    it('should strip non-numeric characters', () => {
      expect(normalizePhoneNumber('(11) 99999-9999')).toBe('5511999999999');
    });

    it('should keep already normalized number', () => {
      expect(normalizePhoneNumber('5511999999999')).toBe('5511999999999');
    });

    it('should handle short numbers as-is', () => {
      expect(normalizePhoneNumber('12345')).toBe('12345');
    });
  });
});
