#!/usr/bin/env node
/**
 * Create ai_governance database if missing. Uses same .env (PG_* or DATABASE_URL) but connects to 'postgres' db first.
 */
import pg from 'pg';
import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

function getConfig() {
  const url = process.env.DATABASE_URL;
  if (url) {
    const u = new URL(url.replace(/^postgresql:\/\//, 'http://'));
    return {
      host: u.hostname,
      port: parseInt(u.port || '5432', 10),
      database: 'postgres',
      user: u.username || 'postgres',
      password: u.password || '',
    };
  }
  const { PG_HOST, PG_PORT, PG_USER, PG_PASSWORD, PG_DATABASE } = process.env;
  if (!PG_HOST || !PG_PORT || !PG_USER) {
    console.error('Set DATABASE_URL or PG_HOST, PG_PORT, PG_USER in .env');
    process.exit(1);
  }
  return {
    host: PG_HOST,
    port: parseInt(PG_PORT, 10),
    database: 'postgres',
    user: PG_USER,
    password: PG_PASSWORD || '',
  };
}

const dbName = process.env.PG_DATABASE || 'ai_governance';
if (!/^[a-z0-9_]+$/.test(dbName)) {
  console.error('Invalid PG_DATABASE name');
  process.exit(1);
}

async function main() {
  const config = getConfig();
  const client = new pg.Client(config);
  try {
    await client.connect();
    const res = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbName]
    );
    if (res.rows.length > 0) {
      console.log(`Database "${dbName}" already exists.`);
      return;
    }
    await client.query(`CREATE DATABASE "${dbName.replace(/"/g, '""')}"`);
    console.log(`Database "${dbName}" created.`);
  } catch (e) {
    if (e.code === '42P04') {
      console.log(`Database "${dbName}" already exists.`);
      return;
    }
    console.error(e.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
