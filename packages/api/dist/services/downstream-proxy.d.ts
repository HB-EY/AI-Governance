/**
 * Downstream action execution (WO-42, WO-56): proxy with circuit breaker.
 */
export interface DownstreamResult {
    success: boolean;
    status_code?: number;
    body?: unknown;
    error?: string;
}
export declare function proxyToDownstream(actionType: string, targetResource: string, parameters: Record<string, unknown>, context?: Record<string, unknown>): Promise<DownstreamResult>;
