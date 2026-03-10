/**
 * Rate limiting per agent and per action type (WO-56). Uses Redis.
 */
export interface RateLimitResult {
    allowed: boolean;
    limit: number;
    remaining: number;
    resetAt: number;
    retryAfterSec?: number;
}
export declare function checkAgentRateLimit(agentId: string): Promise<RateLimitResult>;
export declare function checkActionRateLimit(agentId: string, actionType: string): Promise<RateLimitResult>;
