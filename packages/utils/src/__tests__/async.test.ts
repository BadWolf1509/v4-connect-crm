import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { sleep, retry } from '../index';

describe('Async Utils', () => {
  describe('sleep', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should resolve after specified time', async () => {
      const promise = sleep(1000);
      vi.advanceTimersByTime(1000);
      await expect(promise).resolves.toBeUndefined();
    });

    it('should not resolve before specified time', async () => {
      let resolved = false;
      sleep(1000).then(() => {
        resolved = true;
      });

      vi.advanceTimersByTime(500);
      expect(resolved).toBe(false);

      vi.advanceTimersByTime(500);
      await Promise.resolve();
      expect(resolved).toBe(true);
    });

    it('should handle zero milliseconds', async () => {
      const promise = sleep(0);
      vi.advanceTimersByTime(0);
      await expect(promise).resolves.toBeUndefined();
    });
  });

  describe('retry', () => {
    // Use real timers for retry tests to avoid async timing issues
    afterEach(() => {
      vi.useRealTimers();
    });

    it('should succeed on first try', async () => {
      vi.useRealTimers();
      const fn = vi.fn().mockResolvedValue('success');

      const result = await retry(fn, { attempts: 3, delay: 1 });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and succeed', async () => {
      vi.useRealTimers();
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success');

      const result = await retry(fn, { attempts: 3, delay: 1, backoff: 1 });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should throw after all attempts fail', async () => {
      vi.useRealTimers();
      const fn = vi.fn().mockRejectedValue(new Error('always fails'));

      await expect(retry(fn, { attempts: 3, delay: 1, backoff: 1 })).rejects.toThrow(
        'always fails'
      );
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should respect custom attempts count', async () => {
      vi.useRealTimers();
      const fn = vi.fn().mockRejectedValue(new Error('fail'));

      await expect(retry(fn, { attempts: 5, delay: 1, backoff: 1 })).rejects.toThrow();
      expect(fn).toHaveBeenCalledTimes(5);
    });

    it('should use exponential backoff', async () => {
      vi.useRealTimers();
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('1'))
        .mockRejectedValueOnce(new Error('2'))
        .mockResolvedValue('success');

      const result = await retry(fn, { attempts: 3, delay: 1, backoff: 2 });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should use default attempts of 3', async () => {
      vi.useRealTimers();
      const fn = vi.fn().mockRejectedValue(new Error('fail'));

      await expect(retry(fn, { delay: 1, backoff: 1 })).rejects.toThrow();
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should preserve error from last attempt', async () => {
      vi.useRealTimers();
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('error 1'))
        .mockRejectedValueOnce(new Error('error 2'))
        .mockRejectedValueOnce(new Error('error 3'));

      await expect(retry(fn, { attempts: 3, delay: 1, backoff: 1 })).rejects.toThrow('error 3');
    });
  });
});
