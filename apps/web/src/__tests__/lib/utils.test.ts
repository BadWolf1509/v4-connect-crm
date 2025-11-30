import { describe, expect, it } from 'vitest';
import { cn } from '../../lib/utils';

describe('cn utility', () => {
  it('should merge class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('should handle conditional classes', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz');
    expect(cn('foo', true && 'bar', 'baz')).toBe('foo bar baz');
  });

  it('should handle arrays', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar');
  });

  it('should handle objects', () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz');
  });

  it('should merge tailwind classes correctly', () => {
    // tailwind-merge should handle conflicts
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('should handle empty inputs', () => {
    expect(cn()).toBe('');
    expect(cn('')).toBe('');
    expect(cn(null, undefined)).toBe('');
  });

  it('should handle mixed inputs', () => {
    expect(cn('foo', ['bar', 'baz'], { qux: true })).toBe('foo bar baz qux');
  });

  it('should handle responsive classes', () => {
    expect(cn('text-sm', 'md:text-base', 'lg:text-lg')).toBe(
      'text-sm md:text-base lg:text-lg',
    );
  });

  it('should handle hover states', () => {
    expect(cn('bg-blue-500', 'hover:bg-blue-600')).toBe('bg-blue-500 hover:bg-blue-600');
  });
});
