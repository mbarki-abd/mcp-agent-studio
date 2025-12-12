import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withTimeout, TimeoutError, createTimeoutController } from '../utils/timeout.js';

describe('withTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should resolve if promise completes before timeout', async () => {
    const promise = new Promise<string>((resolve) => {
      setTimeout(() => resolve('success'), 100);
    });

    const resultPromise = withTimeout(promise, 500);
    vi.advanceTimersByTime(100);

    const result = await resultPromise;
    expect(result).toBe('success');
  });

  it('should reject with TimeoutError if timeout exceeded', async () => {
    const promise = new Promise<string>((resolve) => {
      setTimeout(() => resolve('success'), 1000);
    });

    const resultPromise = withTimeout(promise, 100);
    vi.advanceTimersByTime(100);

    await expect(resultPromise).rejects.toThrow(TimeoutError);
  });

  it('should include custom message in TimeoutError', async () => {
    const promise = new Promise<string>((resolve) => {
      setTimeout(() => resolve('success'), 1000);
    });

    const resultPromise = withTimeout(promise, 100, 'Custom timeout message');
    vi.advanceTimersByTime(100);

    await expect(resultPromise).rejects.toThrow('Custom timeout message');
  });

  it('should cleanup timeout when promise resolves', async () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

    const promise = new Promise<string>((resolve) => {
      setTimeout(() => resolve('success'), 50);
    });

    const resultPromise = withTimeout(promise, 500);
    vi.advanceTimersByTime(50);
    await resultPromise;

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it('should cleanup timeout when promise rejects', async () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

    const promise = new Promise<string>((_, reject) => {
      setTimeout(() => reject(new Error('Original error')), 50);
    });

    const resultPromise = withTimeout(promise, 500);
    vi.advanceTimersByTime(50);

    await expect(resultPromise).rejects.toThrow('Original error');
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });
});

describe('createTimeoutController', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should create an AbortController', () => {
    const { controller } = createTimeoutController(1000);
    expect(controller).toBeInstanceOf(AbortController);
  });

  it('should abort after timeout', () => {
    const { controller } = createTimeoutController(100);

    expect(controller.signal.aborted).toBe(false);

    vi.advanceTimersByTime(100);

    expect(controller.signal.aborted).toBe(true);
  });

  it('should not abort before timeout', () => {
    const { controller } = createTimeoutController(100);

    vi.advanceTimersByTime(50);

    expect(controller.signal.aborted).toBe(false);
  });

  it('should cleanup timeout when cleanup is called', () => {
    const { controller, cleanup } = createTimeoutController(100);

    cleanup();
    vi.advanceTimersByTime(200);

    expect(controller.signal.aborted).toBe(false);
  });
});

// withRetry tests are in retry.test.ts to avoid fake timer conflicts

describe('TimeoutError', () => {
  it('should have correct name', () => {
    const error = new TimeoutError();
    expect(error.name).toBe('TimeoutError');
  });

  it('should have default message', () => {
    const error = new TimeoutError();
    expect(error.message).toBe('Operation timed out');
  });

  it('should accept custom message', () => {
    const error = new TimeoutError('Custom message');
    expect(error.message).toBe('Custom message');
  });

  it('should be instanceof Error', () => {
    const error = new TimeoutError();
    expect(error).toBeInstanceOf(Error);
  });
});
