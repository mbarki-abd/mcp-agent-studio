/**
 * withRetry tests - separate file to avoid fake timer conflicts
 */
import { describe, it, expect, vi } from 'vitest';
import { withRetry, TimeoutError } from '../utils/timeout.js';

describe('withRetry', () => {
  it('should return result on first success', async () => {
    const fn = vi.fn().mockResolvedValue('success');

    const result = await withRetry(fn, { maxAttempts: 3, timeout: 5000 });

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure and eventually succeed', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockResolvedValueOnce('success');

    const onRetry = vi.fn();

    const result = await withRetry(fn, {
      maxAttempts: 3,
      timeout: 5000,
      baseDelay: 10,
      onRetry,
    });

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('should throw after max attempts exceeded', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('persistent error'));

    await expect(withRetry(fn, {
      maxAttempts: 2,
      timeout: 5000,
      baseDelay: 10,
    })).rejects.toThrow('persistent error');

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should use linear backoff when specified', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce('success');

    const result = await withRetry(fn, {
      maxAttempts: 3,
      timeout: 5000,
      backoff: 'linear',
      baseDelay: 10,
    });

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should timeout individual attempts', async () => {
    const fn = vi.fn().mockImplementation(() => new Promise((resolve) => {
      setTimeout(() => resolve('too late'), 500);
    }));

    await expect(withRetry(fn, {
      maxAttempts: 1,
      timeout: 50,
    })).rejects.toThrow(TimeoutError);
  });
});
