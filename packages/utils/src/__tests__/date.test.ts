import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import {
  formatDate,
  formatDateTime,
  formatRelativeTime,
  isToday,
  isYesterday,
} from '../index';

describe('Date Utils', () => {
  describe('formatDate', () => {
    it('should format date in pt-BR by default', () => {
      const date = new Date('2024-06-15T10:00:00Z');
      const formatted = formatDate(date);
      expect(formatted).toMatch(/15\/06\/2024/);
    });

    it('should format date in en-US locale', () => {
      const date = new Date('2024-06-15T10:00:00Z');
      const formatted = formatDate(date, 'en-US');
      expect(formatted).toMatch(/06\/15\/2024/);
    });

    it('should handle different dates', () => {
      // Use local date to avoid timezone issues
      const date = new Date(2023, 11, 25); // December 25, 2023
      const formatted = formatDate(date);
      expect(formatted).toMatch(/25\/12\/2023/);
    });
  });

  describe('formatDateTime', () => {
    it('should format date and time in pt-BR', () => {
      const date = new Date('2024-06-15T14:30:00Z');
      const formatted = formatDateTime(date);
      // Time may vary due to timezone, but should contain date parts
      expect(formatted).toContain('15');
      expect(formatted).toContain('06');
      expect(formatted).toContain('2024');
    });

    it('should format date and time in en-US locale', () => {
      const date = new Date('2024-06-15T14:30:00Z');
      const formatted = formatDateTime(date, 'en-US');
      expect(formatted).toContain('06');
      expect(formatted).toContain('15');
      expect(formatted).toContain('2024');
    });
  });

  describe('formatRelativeTime', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should show seconds ago', () => {
      const date = new Date('2024-06-15T11:59:30Z');
      const result = formatRelativeTime(date);
      expect(result).toMatch(/30|segundo/i);
    });

    it('should show minutes ago', () => {
      const date = new Date('2024-06-15T11:55:00Z');
      const result = formatRelativeTime(date);
      expect(result).toMatch(/5|minuto/i);
    });

    it('should show hours ago', () => {
      const date = new Date('2024-06-15T09:00:00Z');
      const result = formatRelativeTime(date);
      expect(result).toMatch(/3|hora/i);
    });

    it('should show days ago', () => {
      // Use a date that's clearly in the past (3 days ago in any timezone)
      const date = new Date('2024-06-12T12:00:00Z');
      const result = formatRelativeTime(date);
      expect(result).toMatch(/3|dias?/i);
    });

    it('should show formatted date for old dates', () => {
      const date = new Date('2024-04-15T12:00:00Z');
      const result = formatRelativeTime(date);
      expect(result).toMatch(/15\/04\/2024/);
    });
  });

  describe('isToday', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-06-15T12:00:00'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return true for today', () => {
      const today = new Date('2024-06-15T08:00:00');
      expect(isToday(today)).toBe(true);
    });

    it('should return true for today at different times', () => {
      const morning = new Date('2024-06-15T00:00:00');
      const evening = new Date('2024-06-15T23:59:59');
      expect(isToday(morning)).toBe(true);
      expect(isToday(evening)).toBe(true);
    });

    it('should return false for yesterday', () => {
      const yesterday = new Date('2024-06-14T12:00:00');
      expect(isToday(yesterday)).toBe(false);
    });

    it('should return false for tomorrow', () => {
      const tomorrow = new Date('2024-06-16T12:00:00');
      expect(isToday(tomorrow)).toBe(false);
    });

    it('should return false for last year same date', () => {
      const lastYear = new Date('2023-06-15T12:00:00');
      expect(isToday(lastYear)).toBe(false);
    });
  });

  describe('isYesterday', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-06-15T12:00:00'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return true for yesterday', () => {
      const yesterday = new Date('2024-06-14T12:00:00');
      expect(isYesterday(yesterday)).toBe(true);
    });

    it('should return true for yesterday at different times', () => {
      const morning = new Date('2024-06-14T00:00:00');
      const evening = new Date('2024-06-14T23:59:59');
      expect(isYesterday(morning)).toBe(true);
      expect(isYesterday(evening)).toBe(true);
    });

    it('should return false for today', () => {
      const today = new Date('2024-06-15T12:00:00');
      expect(isYesterday(today)).toBe(false);
    });

    it('should return false for two days ago', () => {
      const twoDaysAgo = new Date('2024-06-13T12:00:00');
      expect(isYesterday(twoDaysAgo)).toBe(false);
    });

    it('should return false for last year same date', () => {
      const lastYear = new Date('2023-06-14T12:00:00');
      expect(isYesterday(lastYear)).toBe(false);
    });
  });
});
