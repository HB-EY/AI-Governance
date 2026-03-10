/**
 * Redis client and connection. Graceful degradation when Redis is unavailable.
 */
import type { Redis as RedisType } from 'ioredis';
export declare function getRedisUrl(): string | null;
export declare function getRedis(): RedisType | null;
export declare function ensureRedis(): Promise<RedisType | null>;
export declare function getDefaultTtl(kind: 'agent' | 'policy' | 'validation'): number;
export declare function closeRedis(): Promise<void>;
