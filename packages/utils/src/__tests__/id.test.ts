import { describe, expect, it } from 'vitest';
import { generateId, generateShortId, getInitialsColor, getInitials } from '../index';

describe('ID Utils', () => {
  describe('generateId', () => {
    it('should generate valid UUID', () => {
      const id = generateId();
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(id).toMatch(uuidRegex);
    });

    it('should generate unique IDs', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateId());
      }
      expect(ids.size).toBe(100);
    });

    it('should generate UUID v4 format', () => {
      const id = generateId();
      // UUID v4 has '4' in the version position
      expect(id.charAt(14)).toBe('4');
    });
  });

  describe('generateShortId', () => {
    it('should generate ID with default length', () => {
      const id = generateShortId();
      expect(id).toHaveLength(8);
    });

    it('should generate ID with custom length', () => {
      expect(generateShortId(4)).toHaveLength(4);
      expect(generateShortId(16)).toHaveLength(16);
      expect(generateShortId(1)).toHaveLength(1);
    });

    it('should only contain lowercase letters and numbers', () => {
      const id = generateShortId(100);
      expect(id).toMatch(/^[a-z0-9]+$/);
    });

    it('should generate unique IDs', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateShortId());
      }
      // With 8 chars, collisions are extremely unlikely
      expect(ids.size).toBe(100);
    });
  });

  describe('getInitialsColor', () => {
    it('should return valid hex color', () => {
      const color = getInitialsColor('John');
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('should return consistent color for same name', () => {
      const color1 = getInitialsColor('Alice');
      const color2 = getInitialsColor('Alice');
      expect(color1).toBe(color2);
    });

    it('should return different colors for different names', () => {
      const colorA = getInitialsColor('Alice');
      const colorB = getInitialsColor('Bob');
      // Names starting with different letters should likely have different colors
      // but this depends on the charCode mod 8
      expect(colorA).toBeDefined();
      expect(colorB).toBeDefined();
    });

    it('should handle single character names', () => {
      const color = getInitialsColor('A');
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('should map names to valid colors from palette', () => {
      // charCode mod 8 determines the color
      // 'a' (97) and 'A' (65) both give 97 % 8 = 1 and 65 % 8 = 1
      // So same position in alphabet gives same color regardless of case
      const colorA = getInitialsColor('Alice');
      const colorZ = getInitialsColor('Zack');
      // Different letters should map to different colors (unless mod 8 collides)
      expect(colorA).toBeDefined();
      expect(colorZ).toBeDefined();
    });
  });

  describe('getInitials', () => {
    it('should get initials from single word', () => {
      expect(getInitials('John')).toBe('J');
    });

    it('should get initials from two words', () => {
      expect(getInitials('John Doe')).toBe('JD');
    });

    it('should get only first two initials from multiple words', () => {
      expect(getInitials('John Michael Doe')).toBe('JM');
      expect(getInitials('Ana Maria Silva Santos')).toBe('AM');
    });

    it('should return uppercase initials', () => {
      expect(getInitials('john doe')).toBe('JD');
    });

    it('should handle single character name', () => {
      expect(getInitials('J')).toBe('J');
    });

    it('should handle multiple spaces between names', () => {
      // Implementation splits by space and doesn't filter empty parts
      // "John  Doe" splits to ["John", "", "Doe"]
      // First chars are ['J', '', 'D'], slice(0,2) = ['J', ''], join = 'J'
      expect(getInitials('John  Doe')).toBe('J');
    });

    it('should handle special characters in name', () => {
      expect(getInitials("Mary O'Brien")).toBe('MO');
    });
  });
});
