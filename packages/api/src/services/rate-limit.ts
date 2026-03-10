/**
 * Rate limiting per agent and per action type (WO-56). Uses Redis.
 */

import { ensureRedis } from '../cache/client.js';

const WINDOW_SEC = 60;
const DEFAULT_AGENT_LIMIT = 60;   // requests per minute per agent
const DEFAULT_ACTION_LIMIT = 30;  // requests per minute per agent per action_type

function getAgentLimit(): number {
  const v = process.env.RATE_LIMIT_AGENT_PER_MIN;
  return v ? parseInt(v, 10) : DEFAULT_AGENT_LIMIT;
}

function getActionLimit(): number {
  const v = process.env.RATE_LIMIT_ACTION_PER_MIN;
  return v ? parseInt(v, 10) : DEFAULT_ACTION_LIMIT;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;  // unix seconds
  retryAfterSec?: number;
}

export async function checkAgentRateLimit(agentId: string): Promise<RateLimitResult> {
  const redis = await ensureRedis();
  const limit = getAgentLimit();
  if (!redis) {
    return { allowed: true, limit, remaining: limit, resetAt: Math.floor(Date.now() / 1000) + WINDOW_SEC };
  }
  const now = Math.floor(Date.now() / 1000);
  const bucket = Math.floor(now / WINDOW_SEC);
  const key = `ratelimit:agent:${agentId}:${bucket}`;
  try {
    const multi = redis.multi();
    multi.incr(key);
    multi.expire(key, WINDOW_SEC * 2);
    const results = await multi.exec();
    const count = results?.[0]?.[1] as number | undefined;
    const current = typeof count === 'number' ? count : 0;
    const allowed = current <= limit;
    const remaining = Math.max(0, limit - current);
    const resetAt = (bucket + 1) * WINDOW_SEC;
    const retryAfterSec = allowed ? undefined : Math.max(1, resetAt - now);
    return { allowed, limit, remaining, resetAt, retryAfterSec };
  } catch {
    return { allowed: true, limit, remaining: limit, resetAt: now + WINDOW_SEC };
  }
}

export async function checkActionRateLimit(agentId: string, actionType: string): Promise<RateLimitResult> {
  const redis = await ensureRedis();
  const limit = getActionLimit();
  if (!redis) {
    return { allowed: true, limit, remaining: limit, resetAt: Math.floor(Date.now() / 1000) + WINDOW_SEC };
  }
  const now = Math.floor(Date.now() / 1000);
  const bucket = Math.floor(now / WINDOW_SEC);
  const key = `ratelimit:action:${agentId}:${actionType}:${bucket}`;
  try {
    const multi = redis.multi();
    multi.incr(key);
    multi.expire(key, WINDOW_SEC * 2);
    const results = await multi.exec();
    const count = results?.[0]?.[1] as number | undefined;
    const current = typeof count === 'number' ? count : 0;
    const allowed = current <= limit;
    const remaining = Math.max(0, limit - current);
    const resetAt = (bucket + 1) * WINDOW_SEC;
    const retryAfterSec = allowed ? undefined : Math.max(1, resetAt - now);
    return { allowed, limit, remaining, resetAt, retryAfterSec };
  } catch {
    return { allowed: true, limit, remaining: limit, resetAt: now + WINDOW_SEC };
  }
}
