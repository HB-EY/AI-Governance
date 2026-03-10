/**
 * Circuit breaker for external dependencies (WO-56). States: closed, open, half-open.
 */
export type CircuitState = 'closed' | 'open' | 'half_open';
export interface CircuitBreakerOptions {
    failureThreshold: number;
    successThreshold: number;
    openTimeoutMs: number;
}
export declare class CircuitBreaker {
    private state;
    private failures;
    private successes;
    private lastFailureAt;
    private readonly opts;
    constructor(options?: Partial<CircuitBreakerOptions>);
    getState(): CircuitState;
    recordSuccess(): void;
    recordFailure(): void;
    canExecute(): boolean;
}
