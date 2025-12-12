/**
 * Timeout Utilities
 *
 * Provides timeout handling with AbortController support
 * for async operations.
 */

export class TimeoutError extends Error {
  constructor(message: string = 'Operation timed out') {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * Wraps a promise with a timeout
 * @param promise The promise to wrap
 * @param ms Timeout in milliseconds
 * @param message Optional error message
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message?: string
): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = globalThis.setTimeout(() => {
      reject(new TimeoutError(message || `Operation timed out after ${ms}ms`));
    }, ms);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    globalThis.clearTimeout(timeoutHandle!);
  }
}

/**
 * Creates an AbortController that automatically aborts after a timeout
 * @param ms Timeout in milliseconds
 */
export function createTimeoutController(ms: number): {
  controller: AbortController;
  cleanup: () => void;
} {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), ms);

  return {
    controller,
    cleanup: () => globalThis.clearTimeout(timeoutId),
  };
}

/**
 * Wraps an async function with timeout and optional retries
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    timeout?: number;
    backoff?: 'linear' | 'exponential';
    baseDelay?: number;
    onRetry?: (attempt: number, error: Error) => void;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    timeout = 30000,
    backoff = 'exponential',
    baseDelay = 1000,
    onRetry,
  } = options;

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await withTimeout(fn(), timeout);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxAttempts) {
        onRetry?.(attempt, lastError);

        const delay = backoff === 'exponential'
          ? baseDelay * Math.pow(2, attempt - 1)
          : baseDelay * attempt;

        await new Promise(resolve => globalThis.setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Creates a debounced async function
 */
export function debounceAsync<T extends (...args: Parameters<T>) => Promise<ReturnType<T>>>(
  fn: T,
  ms: number
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let pendingPromise: Promise<ReturnType<T>> | null = null;
  let pendingResolve: ((value: ReturnType<T>) => void) | null = null;
  let pendingReject: ((error: Error) => void) | null = null;

  return (...args: Parameters<T>): Promise<ReturnType<T>> => {
    if (timeoutId) {
      globalThis.clearTimeout(timeoutId);
    }

    if (!pendingPromise) {
      pendingPromise = new Promise((resolve, reject) => {
        pendingResolve = resolve;
        pendingReject = reject;
      });
    }

    timeoutId = globalThis.setTimeout(async () => {
      try {
        const result = await fn(...args);
        pendingResolve?.(result);
      } catch (error) {
        pendingReject?.(error instanceof Error ? error : new Error(String(error)));
      } finally {
        pendingPromise = null;
        pendingResolve = null;
        pendingReject = null;
        timeoutId = null;
      }
    }, ms);

    return pendingPromise;
  };
}
