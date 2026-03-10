/**
 * Circuit breaker for external dependencies (WO-56). States: closed, open, half-open.
 */

export type CircuitState = 'closed' | 'open' | 'half_open';

export interface CircuitBreakerOptions {
  failureThreshold: number;
  successThreshold: number;
  openTimeoutMs: number;
}

const DEFAULTS: CircuitBreakerOptions = {
  failureThreshold: 5,
  successThreshold: 2,
  openTimeoutMs: 30_000,
};

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failures = 0;
  private successes = 0;
  private lastFailureAt = 0;
  private readonly opts: CircuitBreakerOptions;

  constructor(options: Partial<CircuitBreakerOptions> = {}) {
    this.opts = { ...DEFAULTS, ...options };
  }

  getState(): CircuitState {
    if (this.state === 'open' && Date.now() - this.lastFailureAt >= this.opts.openTimeoutMs) {
      this.state = 'half_open';
      this.successes = 0;
    }
    return this.state;
  }

  recordSuccess(): void {
    this.getState();
    if (this.state === 'half_open') {
      this.successes++;
      if (this.successes >= this.opts.successThreshold) {
        this.state = 'closed';
        this.failures = 0;
      }
    } else if (this.state === 'closed') {
      this.failures = 0;
    }
  }

  recordFailure(): void {
    this.getState();
    this.failures++;
    this.lastFailureAt = Date.now();
    if (this.state === 'closed' && this.failures >= this.opts.failureThreshold) {
      this.state = 'open';
    } else if (this.state === 'half_open') {
      this.state = 'open';
    }
  }

  canExecute(): boolean {
    return this.getState() !== 'open';
  }
}
