import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CircuitBreaker, CircuitOpenError, circuitBreakers } from '../utils/circuit-breaker.js';

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeout: 1000,
      successThreshold: 2,
    });
  });

  describe('CLOSED state', () => {
    it('should start in CLOSED state', () => {
      expect(breaker.getStats().state).toBe('CLOSED');
    });

    it('should execute successful calls', async () => {
      const result = await breaker.execute(() => Promise.resolve('success'));
      expect(result).toBe('success');
    });

    it('should track successful calls', async () => {
      await breaker.execute(() => Promise.resolve('ok'));
      const stats = breaker.getStats();
      expect(stats.totalRequests).toBe(1);
      expect(stats.lastSuccess).toBeInstanceOf(Date);
    });

    it('should track failed calls', async () => {
      try {
        await breaker.execute(() => Promise.reject(new Error('fail')));
      } catch {
        // expected
      }
      const stats = breaker.getStats();
      expect(stats.failures).toBe(1);
      expect(stats.totalFailures).toBe(1);
      expect(stats.lastFailure).toBeInstanceOf(Date);
    });

    it('should open after reaching failure threshold', async () => {
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(() => Promise.reject(new Error('fail')));
        } catch {
          // expected
        }
      }
      expect(breaker.getStats().state).toBe('OPEN');
    });
  });

  describe('OPEN state', () => {
    beforeEach(async () => {
      // Trigger circuit to open
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(() => Promise.reject(new Error('fail')));
        } catch {
          // expected
        }
      }
    });

    it('should reject calls immediately when OPEN', async () => {
      await expect(breaker.execute(() => Promise.resolve('ok')))
        .rejects.toThrow(CircuitOpenError);
    });

    it('should transition to HALF_OPEN after reset timeout', async () => {
      vi.useFakeTimers();

      // Advance time past reset timeout
      vi.advanceTimersByTime(1100);

      // Next call should be allowed (circuit transitions to HALF_OPEN)
      const result = await breaker.execute(() => Promise.resolve('recovered'));
      expect(result).toBe('recovered');
      expect(breaker.getStats().state).toBe('HALF_OPEN');

      vi.useRealTimers();
    });
  });

  describe('HALF_OPEN state', () => {
    beforeEach(async () => {
      vi.useFakeTimers();

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(() => Promise.reject(new Error('fail')));
        } catch {
          // expected
        }
      }

      // Advance past reset timeout
      vi.advanceTimersByTime(1100);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should close after success threshold reached', async () => {
      // First successful call transitions to HALF_OPEN
      await breaker.execute(() => Promise.resolve('ok'));
      expect(breaker.getStats().state).toBe('HALF_OPEN');

      // Second successful call closes the circuit
      await breaker.execute(() => Promise.resolve('ok'));
      expect(breaker.getStats().state).toBe('CLOSED');
    });

    it('should reopen on single failure in HALF_OPEN', async () => {
      // Transition to HALF_OPEN with a successful call
      await breaker.execute(() => Promise.resolve('ok'));
      expect(breaker.getStats().state).toBe('HALF_OPEN');

      // A single failure should reopen the circuit
      try {
        await breaker.execute(() => Promise.reject(new Error('fail again')));
      } catch {
        // expected
      }
      expect(breaker.getStats().state).toBe('OPEN');
    });
  });

  describe('isAvailable', () => {
    it('should return true when CLOSED', () => {
      expect(breaker.isAvailable()).toBe(true);
    });

    it('should return false when OPEN and not ready for retry', () => {
      breaker.forceState('OPEN');
      expect(breaker.isAvailable()).toBe(false);
    });

    it('should return true when HALF_OPEN', () => {
      breaker.forceState('HALF_OPEN');
      expect(breaker.isAvailable()).toBe(true);
    });
  });

  describe('forceState', () => {
    it('should force state to CLOSED and reset counters', async () => {
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(() => Promise.reject(new Error('fail')));
        } catch {
          // expected
        }
      }

      breaker.forceState('CLOSED');
      const stats = breaker.getStats();
      expect(stats.state).toBe('CLOSED');
      expect(stats.failures).toBe(0);
      expect(stats.successes).toBe(0);
    });
  });

  describe('state change callback', () => {
    it('should call onStateChange when state changes', async () => {
      const onStateChange = vi.fn();
      const breakerWithCallback = new CircuitBreaker({
        failureThreshold: 2,
        onStateChange,
      });

      // Trigger state change to OPEN
      for (let i = 0; i < 2; i++) {
        try {
          await breakerWithCallback.execute(() => Promise.reject(new Error('fail')));
        } catch {
          // expected
        }
      }

      expect(onStateChange).toHaveBeenCalledWith('CLOSED', 'OPEN');
    });
  });
});

describe('CircuitBreakerRegistry', () => {
  beforeEach(() => {
    circuitBreakers.clear();
  });

  it('should create and cache circuit breakers by name', () => {
    const breaker1 = circuitBreakers.get('service-a');
    const breaker2 = circuitBreakers.get('service-a');
    expect(breaker1).toBe(breaker2);
  });

  it('should create different breakers for different names', () => {
    const breaker1 = circuitBreakers.get('service-a');
    const breaker2 = circuitBreakers.get('service-b');
    expect(breaker1).not.toBe(breaker2);
  });

  it('should return all registered breakers', () => {
    circuitBreakers.get('service-a');
    circuitBreakers.get('service-b');
    const all = circuitBreakers.getAll();
    expect(all.size).toBe(2);
    expect(all.has('service-a')).toBe(true);
    expect(all.has('service-b')).toBe(true);
  });

  it('should remove a breaker', () => {
    circuitBreakers.get('service-a');
    expect(circuitBreakers.remove('service-a')).toBe(true);
    expect(circuitBreakers.getAll().has('service-a')).toBe(false);
  });

  it('should clear all breakers', () => {
    circuitBreakers.get('service-a');
    circuitBreakers.get('service-b');
    circuitBreakers.clear();
    expect(circuitBreakers.getAll().size).toBe(0);
  });
});
