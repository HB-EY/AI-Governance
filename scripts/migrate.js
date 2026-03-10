#!/usr/bin/env node
/**
 * Migration runner for PostgreSQL.
 * Tracks applied migrations in schema_migrations table.
 * Usage: node scripts/migrate.js up | down | status
 */

import pg from 'pg';
import { readdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

const MIGRATIONS_DIR = join(__dirname, '..', 'migrations');

const bootstrapSql = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(255) PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

function getConnectionConfig() {
  const connectionString =
    process.env.DATABASE_URL ||
    (process.env.PG_HOST && process.env.PG_PORT && process.env.PG_USER && process.env.PG_DATABASE
      ? `postgresql://${process.env.PG_USER}${process.env.PG_PASSWORD != null ? ':' + process.env.PG_PASSWORD : ''}@${process.env.PG_HOST}:${process.env.PG_PORT}/${process.env.PG_DATABASE}`
      : null);
  if (!connectionString) {
    console.error(
      'Database config missing. Set DATABASE_URL or PG_HOST, PG_PORT, PG_USER, PG_DATABASE (and optionally PG_PASSWORD).'
    );
    process.exit(1);
  }
  const config = {
    max: 2,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 5000,
  };
  // pg/SASL requires password to be a string; build explicit config so password is never undefined
  try {
    const u = new URL(connectionString.replace(/^postgresql:\/\//, 'http://'));
    config.host = u.hostname;
    config.port = parseInt(u.port || '5432', 10);
    config.database = (u.pathname || '/').replace(/^\//, '') || 'postgres';
    config.user = u.username || undefined;
    config.password = u.password || '';
  } catch (_) {
    config.connectionString = connectionString;
  }
  return config;
}

async function ensureSchemaMigrations(client) {
  await client.query(bootstrapSql);
}

async function getMigrationFiles() {
  const entries = await readdir(MIGRATIONS_DIR, { withFileTypes: true });
  const upFiles = entries
    .filter((e) => e.isFile() && e.name.endsWith('.up.sql'))
    .map((e) => e.name)
    .sort();
  return upFiles.map((f) => f.replace(/\.up\.sql$/, ''));
}

async function getAppliedVersions(client) {
  const r = await client.query(
    'SELECT version FROM schema_migrations ORDER BY version'
  );
  return r.rows.map((row) => row.version);
}

async function runUp(client, version) {
  const upPath = join(MIGRATIONS_DIR, `${version}.up.sql`);
  const sql = await readFile(upPath, 'utf8');
  await client.query('BEGIN');
  try {
    await client.query(sql);
    await client.query(
      'INSERT INTO schema_migrations (version) VALUES ($1)',
      [version]
    );
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  }
}

async function runDown(client, version) {
  const downPath = join(MIGRATIONS_DIR, `${version}.down.sql`);
  const sql = await readFile(downPath, 'utf8');
  await client.query('BEGIN');
  try {
    await client.query(sql);
    await client.query('DELETE FROM schema_migrations WHERE version = $1', [
      version,
    ]);
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  }
}

async function main() {
  const command = process.argv[2] || 'status';
  if (!['up', 'down', 'status'].includes(command)) {
    console.error('Usage: node scripts/migrate.js up | down | status');
    process.exit(1);
  }

  const pool = new pg.Pool(getConnectionConfig());
  const client = await pool.connect();

  try {
    await ensureSchemaMigrations(client);
    const versions = await getMigrationFiles();
    const applied = await getAppliedVersions(client);

    if (command === 'status') {
      console.log('Migration status:');
      for (const v of versions) {
        const done = applied.includes(v);
        console.log(`  ${done ? '[x]' : '[ ]'} ${v}`);
      }
      return;
    }

    if (command === 'up') {
      const pending = versions.filter((v) => !applied.includes(v));
      for (const v of pending) {
        console.log(`Running ${v}...`);
        await runUp(client, v);
        console.log(`  Done.`);
      }
      if (pending.length === 0) console.log('No pending migrations.');
      return;
    }

    if (command === 'down') {
      const last = applied[applied.length - 1];
      if (!last) {
        console.log('No applied migrations to roll back.');
        return;
      }
      console.log(`Rolling back ${last}...`);
      await runDown(client, last);
      console.log('  Done.');
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  const msg = err?.message || '';
  if (msg.includes('SCRAM') && msg.includes('password')) {
    console.error(
      'Database connection failed: PostgreSQL is using SCRAM authentication and requires a password.\n' +
        'Set PG_PASSWORD in your .env file to your Postgres user password, e.g.:\n  PG_PASSWORD=your_password'
    );
  } else {
    console.error(err);
  }
  process.exit(1);
});
