/**
 * Pub-sub channel for cache invalidation. Subscribers invalidate local caches when notified.
 */

import { ensureRedis, getRedis } from './client.js';

export const INVALIDATION_CHANNEL = 'ai-governance:cache-invalidate';

export type InvalidationMessage = { key?: string; pattern?: string; keys?: string[] };

export async function publishInvalidation(msg: InvalidationMessage): Promise<boolean> {
  const r = await ensureRedis();
  if (!r) return false;
  try {
    await r.publish(INVALIDATION_CHANNEL, JSON.stringify(msg));
    return true;
  } catch {
    return false;
  }
}

export function subscribeInvalidation(
  onMessage: (msg: InvalidationMessage) => void | Promise<void>
): { unsubscribe: () => Promise<void> } {
  const r = getRedis();
  if (!r) return { unsubscribe: async () => {} };
  const sub = r.duplicate();
  sub.subscribe(INVALIDATION_CHANNEL);
  sub.on('message', (_ch: string, payload: string) => {
    try {
      const msg = JSON.parse(payload) as InvalidationMessage;
      void Promise.resolve(onMessage(msg)).catch(() => {});
    } catch {}
  });
  return {
    async unsubscribe() {
      await sub.unsubscribe(INVALIDATION_CHANNEL);
      sub.disconnect();
    },
  };
}
