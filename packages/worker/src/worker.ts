/**
 * Background worker: poll job queue, run handlers, scheduled tasks, graceful shutdown.
 */

import 'dotenv/config';
import { getPool, closePool } from './db/pool.js';
import { pollNext, complete, fail } from './queue/index.js';
import { getHandler } from './handlers/index.js';
import { scheduleEveryMinute, startScheduler, stopScheduler } from './scheduler.js';
import { startHealthServer, stopHealthServer } from './health.js';
import { runApprovalTimeout } from './approval-timeout.js';
import { runEvidenceExport } from './evidence-export.js';
import { registerHandler } from './handlers/index.js';

const POLL_INTERVAL_MS = 2000;
const CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY ?? '2', 10);
const HEALTH_PORT = parseInt(process.env.WORKER_HEALTH_PORT ?? '3001', 10);
const QUEUE_NAME = process.env.WORKER_QUEUE ?? 'default';

let running = true;

async function processOne(): Promise<boolean> {
  const pool = getPool();
  if (!pool) return false;
  const job = await pollNext(pool, QUEUE_NAME);
  if (!job) return false;
  const handler = getHandler(job.name);
  if (!handler) {
    await fail(pool, job.id, `No handler for job: ${job.name}`);
    return true;
  }
  try {
    await handler(job);
    await complete(pool, job.id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await fail(pool, job.id, msg);
  }
  return true;
}

async function runLoop(): Promise<void> {
  const pool = getPool();
  if (!pool) {
    console.error('[worker] No database pool; set DATABASE_URL or PG_* env');
    return;
  }
  while (running) {
    let didWork = false;
    for (let i = 0; i < CONCURRENCY; i++) {
      const ok = await processOne();
      if (ok) didWork = true;
    }
    if (!didWork) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }
  }
}

async function scheduledApprovalTimeout(): Promise<void> {
  try {
    const n = await runApprovalTimeout();
    if (n > 0) console.info('[worker] approval timeout job processed', n, 'expired');
  } catch (err) {
    console.error('[worker] approval timeout job error', err);
  }
}

function shutdown(signal: string): void {
  console.info(`[worker] ${signal} received, shutting down`);
  running = false;
  stopScheduler();
  stopHealthServer()
    .then(() => closePool())
    .then(() => {
      console.info('[worker] shutdown complete');
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

async function main(): Promise<void> {
  registerHandler('evidence_export', runEvidenceExport);
  scheduleEveryMinute(scheduledApprovalTimeout);
  startScheduler();
  startHealthServer(HEALTH_PORT);
  runLoop();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
