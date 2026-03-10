/**
 * Circuit breaker for external dependencies (WO-56). States: closed, open, half-open.
 */
const DEFAULTS = {
    failureThreshold: 5,
    successThreshold: 2,
    openTimeoutMs: 30_000,
};
export class CircuitBreaker {
    state = 'closed';
    failures = 0;
    successes = 0;
    lastFailureAt = 0;
    opts;
    constructor(options = {}) {
        this.opts = { ...DEFAULTS, ...options };
    }
    getState() {
        if (this.state === 'open' && Date.now() - this.lastFailureAt >= this.opts.openTimeoutMs) {
            this.state = 'half_open';
            this.successes = 0;
        }
        return this.state;
    }
    recordSuccess() {
        this.getState();
        if (this.state === 'half_open') {
            this.successes++;
            if (this.successes >= this.opts.successThreshold) {
                this.state = 'closed';
                this.failures = 0;
            }
        }
        else if (this.state === 'closed') {
            this.failures = 0;
        }
    }
    recordFailure() {
        this.getState();
        this.failures++;
        this.lastFailureAt = Date.now();
        if (this.state === 'closed' && this.failures >= this.opts.failureThreshold) {
            this.state = 'open';
        }
        else if (this.state === 'half_open') {
            this.state = 'open';
        }
    }
    canExecute() {
        return this.getState() !== 'open';
    }
}
