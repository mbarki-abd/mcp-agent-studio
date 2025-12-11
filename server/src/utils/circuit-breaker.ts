/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascade failures by failing fast when a service is unhealthy
 *
 * States:
 * - CLOSED: Normal operation, requests go through
 * - OPEN: Service is failing, requests fail immediately
 * - HALF_OPEN: Testing if service has recovered
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerOptions {
  /** Number of failures before opening the circuit */
  failureThreshold?: number;
  /** Time in ms before attempting recovery */
  resetTimeout?: number;
  /** Number of successful calls in HALF_OPEN to close circuit */
  successThreshold?: number;
  /** Optional callback when state changes */
  onStateChange?: (from: CircuitState, to: CircuitState) => void;
}

interface CircuitStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailure?: Date;
  lastSuccess?: Date;
  totalRequests: number;
  totalFailures: number;
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failures = 0;
  private successes = 0;
  private lastFailure?: Date;
  private lastSuccess?: Date;
  private nextAttempt?: Date;
  private totalRequests = 0;
  private totalFailures = 0;

  private readonly failureThreshold: number;
  private readonly resetTimeout: number;
  private readonly successThreshold: number;
  private readonly onStateChange?: (from: CircuitState, to: CircuitState) => void;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 5;
    this.resetTimeout = options.resetTimeout ?? 30000; // 30 seconds
    this.successThreshold = options.successThreshold ?? 2;
    this.onStateChange = options.onStateChange;
  }

  private setState(newState: CircuitState) {
    if (this.state !== newState) {
      const oldState = this.state;
      this.state = newState;
      this.onStateChange?.(oldState, newState);
    }
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalRequests++;

    // Check if circuit is OPEN
    if (this.state === 'OPEN') {
      if (this.nextAttempt && new Date() >= this.nextAttempt) {
        // Time to try again
        this.setState('HALF_OPEN');
        this.successes = 0;
      } else {
        throw new CircuitOpenError('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.lastSuccess = new Date();
    this.failures = 0;

    if (this.state === 'HALF_OPEN') {
      this.successes++;
      if (this.successes >= this.successThreshold) {
        this.setState('CLOSED');
      }
    }
  }

  private onFailure() {
    this.lastFailure = new Date();
    this.failures++;
    this.totalFailures++;

    if (this.state === 'HALF_OPEN') {
      // Single failure in HALF_OPEN reopens the circuit
      this.setState('OPEN');
      this.nextAttempt = new Date(Date.now() + this.resetTimeout);
    } else if (this.failures >= this.failureThreshold) {
      this.setState('OPEN');
      this.nextAttempt = new Date(Date.now() + this.resetTimeout);
    }
  }

  /**
   * Force the circuit to a specific state (for testing/admin)
   */
  forceState(state: CircuitState) {
    this.setState(state);
    if (state === 'CLOSED') {
      this.failures = 0;
      this.successes = 0;
      this.nextAttempt = undefined;
    }
  }

  /**
   * Get current circuit stats
   */
  getStats(): CircuitStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailure: this.lastFailure,
      lastSuccess: this.lastSuccess,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
    };
  }

  /**
   * Check if the circuit allows requests
   */
  isAvailable(): boolean {
    if (this.state === 'CLOSED') return true;
    if (this.state === 'HALF_OPEN') return true;
    if (this.state === 'OPEN' && this.nextAttempt && new Date() >= this.nextAttempt) {
      return true; // Time to retry
    }
    return false;
  }
}

export class CircuitOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitOpenError';
  }
}

// Circuit breaker registry for managing multiple circuits
class CircuitBreakerRegistry {
  private circuits: Map<string, CircuitBreaker> = new Map();

  get(name: string, options?: CircuitBreakerOptions): CircuitBreaker {
    let circuit = this.circuits.get(name);
    if (!circuit) {
      circuit = new CircuitBreaker(options);
      this.circuits.set(name, circuit);
    }
    return circuit;
  }

  getAll(): Map<string, CircuitBreaker> {
    return this.circuits;
  }

  remove(name: string): boolean {
    return this.circuits.delete(name);
  }

  clear(): void {
    this.circuits.clear();
  }
}

export const circuitBreakers = new CircuitBreakerRegistry();
