/**
 * PostgreSQL connection pool. Uses pg with config from env.
 */

import pg from 'pg';
import { getDbConfig } from './config.js';

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!pool) {
    const config = getDbConfig();
    if (!config) throw new Error('Database not configured. Set DATABASE_URL or PG_* env vars.');
    pool = new pg.Pool({
      ...config,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 5000,
    });
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
