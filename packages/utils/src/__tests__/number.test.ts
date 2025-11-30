import { describe, expect, it } from 'vitest';
import { formatCurrency, formatNumber, formatPercentage, formatBytes } from '../index';

describe('Number Utils', () => {
  describe('formatCurrency', () => {
    it('should format BRL by default', () => {
      const result = formatCurrency(1234.56);
      expect(result).toContain('1.234,56');
      expect(result).toMatch(/R\$|BRL/);
    });

    it('should format USD', () => {
      const result = formatCurrency(1234.56, 'USD', 'en-US');
      expect(result).toContain('1,234.56');
      expect(result).toMatch(/\$/);
    });

    it('should format EUR', () => {
      const result = formatCurrency(1234.56, 'EUR', 'de-DE');
      expect(result).toContain('1.234,56');
      expect(result).toMatch(/€/);
    });

    it('should handle zero', () => {
      const result = formatCurrency(0);
      expect(result).toContain('0');
    });

    it('should handle negative values', () => {
      const result = formatCurrency(-1234.56);
      expect(result).toContain('1.234,56');
      expect(result).toMatch(/-/);
    });

    it('should handle large values', () => {
      const result = formatCurrency(1000000);
      expect(result).toContain('1.000.000');
    });
  });

  describe('formatNumber', () => {
    it('should format number with pt-BR locale', () => {
      expect(formatNumber(1234567.89)).toBe('1.234.567,89');
    });

    it('should format number with en-US locale', () => {
      expect(formatNumber(1234567.89, 'en-US')).toBe('1,234,567.89');
    });

    it('should handle integers', () => {
      expect(formatNumber(1234567)).toBe('1.234.567');
    });

    it('should handle zero', () => {
      expect(formatNumber(0)).toBe('0');
    });

    it('should handle negative numbers', () => {
      expect(formatNumber(-1234)).toContain('1.234');
    });
  });

  describe('formatPercentage', () => {
    it('should format decimal to percentage', () => {
      expect(formatPercentage(0.5)).toBe('50.0%');
    });

    it('should use specified decimals', () => {
      expect(formatPercentage(0.3333, 2)).toBe('33.33%');
      expect(formatPercentage(0.3333, 0)).toBe('33%');
    });

    it('should handle zero', () => {
      expect(formatPercentage(0)).toBe('0.0%');
    });

    it('should handle 100%', () => {
      expect(formatPercentage(1)).toBe('100.0%');
    });

    it('should handle values over 100%', () => {
      expect(formatPercentage(1.5)).toBe('150.0%');
    });

    it('should handle negative percentages', () => {
      expect(formatPercentage(-0.1)).toBe('-10.0%');
    });
  });

  describe('formatBytes', () => {
    it('should format bytes', () => {
      expect(formatBytes(500)).toBe('500 Bytes');
    });

    it('should format kilobytes', () => {
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1536)).toBe('1.5 KB');
    });

    it('should format megabytes', () => {
      expect(formatBytes(1048576)).toBe('1 MB');
      expect(formatBytes(5242880)).toBe('5 MB');
    });

    it('should format gigabytes', () => {
      expect(formatBytes(1073741824)).toBe('1 GB');
    });

    it('should handle zero bytes', () => {
      expect(formatBytes(0)).toBe('0 Bytes');
    });

    it('should respect decimals parameter', () => {
      expect(formatBytes(1536, 0)).toBe('2 KB');
      expect(formatBytes(1536, 3)).toBe('1.5 KB');
    });

    it('should handle large file sizes', () => {
      expect(formatBytes(10737418240)).toBe('10 GB');
    });
  });
});
