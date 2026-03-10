/**
 * Redis client and connection. Graceful degradation when Redis is unavailable.
 */
const DEFAULT_TTL_AGENT = 300; // 5 min
const DEFAULT_TTL_POLICY = 300;
const DEFAULT_TTL_VALIDATION = 600; // 10 min
let redis = null;
export function getRedisUrl() {
    return process.env.REDIS_URL ?? process.env.REDIS_HOST
        ? `redis://${process.env.REDIS_HOST ?? 'localhost'}:${process.env.REDIS_PORT ?? '6379'}`
        : null;
}
export function getRedis() {
    if (redis)
        return redis;
    const url = getRedisUrl();
    if (!url)
        return null;
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const Redis = require('ioredis');
        redis = new Redis(url, {
            maxRetriesPerRequest: 2,
            retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 2000)),
            lazyConnect: true,
        });
        return redis;
    }
    catch {
        return null;
    }
}
export async function ensureRedis() {
    const r = getRedis();
    if (!r)
        return null;
    try {
        await r.ping();
        return r;
    }
    catch {
        return null;
    }
}
export function getDefaultTtl(kind) {
    const env = process.env[`CACHE_TTL_${kind.toUpperCase()}`];
    if (env)
        return parseInt(env, 10) || (kind === 'validation' ? DEFAULT_TTL_VALIDATION : DEFAULT_TTL_AGENT);
    return kind === 'validation' ? DEFAULT_TTL_VALIDATION : kind === 'policy' ? DEFAULT_TTL_POLICY : DEFAULT_TTL_AGENT;
}
export async function closeRedis() {
    if (redis) {
        await redis.quit();
        redis = null;
    }
}
