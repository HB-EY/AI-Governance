/**
 * PostgreSQL connection pool for the Agent Governance Control Plane.
 * Configure via DATABASE_URL or PG_* env vars. Use for migrations and app runtime.
 */
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '..', '.env') });

function getConnectionString() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const { PG_HOST, PG_PORT, PG_USER, PG_PASSWORD, PG_DATABASE } = process.env;
  if (PG_HOST && PG_PORT && PG_USER && PG_DATABASE) {
    const auth = PG_PASSWORD ? `${PG_USER}:${PG_PASSWORD}` : PG_USER;
    return `postgresql://${auth}@${PG_HOST}:${PG_PORT}/${PG_DATABASE}`;
  }
  return null;
}

const connectionString = getConnectionString();

export const pool =
  connectionString &&
  new pg.Pool({
    connectionString,
    max: parseInt(process.env.PG_POOL_SIZE || '10', 10),
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 5000,
  });

export async function getClient() {
  if (!pool) throw new Error('Database not configured. Set DATABASE_URL or PG_* env vars.');
  return pool.connect();
}
