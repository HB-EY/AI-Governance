/**
 * Pub-sub channel for cache invalidation. Subscribers invalidate local caches when notified.
 */
import { ensureRedis, getRedis } from './client.js';
export const INVALIDATION_CHANNEL = 'ai-governance:cache-invalidate';
export async function publishInvalidation(msg) {
    const r = await ensureRedis();
    if (!r)
        return false;
    try {
        await r.publish(INVALIDATION_CHANNEL, JSON.stringify(msg));
        return true;
    }
    catch {
        return false;
    }
}
export function subscribeInvalidation(onMessage) {
    const r = getRedis();
    if (!r)
        return { unsubscribe: async () => { } };
    const sub = r.duplicate();
    sub.subscribe(INVALIDATION_CHANNEL);
    sub.on('message', (_ch, payload) => {
        try {
            const msg = JSON.parse(payload);
            void Promise.resolve(onMessage(msg)).catch(() => { });
        }
        catch { }
    });
    return {
        async unsubscribe() {
            await sub.unsubscribe(INVALIDATION_CHANNEL);
            sub.disconnect();
        },
    };
}
