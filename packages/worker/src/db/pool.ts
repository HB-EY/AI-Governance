import type { Pool } from 'pg';
import pg from 'pg';
import { getDbConfig } from './config.js';

let pool: Pool | null = null;

export function getPool(): Pool | null {
  if (pool) return pool;
  const config = getDbConfig();
  if (!config) return null;
  pool = new pg.Pool(config);
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
