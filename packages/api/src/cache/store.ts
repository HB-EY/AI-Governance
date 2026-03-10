/**
 * Cache get/set/delete with error handling and graceful degradation.
 */

import { ensureRedis, getDefaultTtl } from './client.js';

export async function cacheGet<T = string>(key: string): Promise<T | null> {
  const r = await ensureRedis();
  if (!r) return null;
  try {
    const raw = await r.get(key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return raw as T;
    }
  } catch {
    return null;
  }
}

export async function cacheSet(
  key: string,
  value: string | object,
  ttlSeconds?: number
): Promise<boolean> {
  const r = await ensureRedis();
  if (!r) return false;
  try {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    const ttl = ttlSeconds ?? 300;
    await r.setex(key, ttl, serialized);
    return true;
  } catch {
    return false;
  }
}

export async function cacheDelete(key: string): Promise<boolean> {
  const r = await ensureRedis();
  if (!r) return false;
  try {
    await r.del(key);
    return true;
  } catch {
    return false;
  }
}

export async function cacheDeleteMany(keys: string[]): Promise<boolean> {
  if (keys.length === 0) return true;
  const r = await ensureRedis();
  if (!r) return false;
  try {
    await r.del(...keys);
    return true;
  } catch {
    return false;
  }
}
