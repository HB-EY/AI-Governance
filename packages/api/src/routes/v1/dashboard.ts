/**
 * Dashboard metrics API (WO-43): aggregate counts, 30s cache.
 * When user auth is not configured (no USER_JWT_SECRET), allows unauthenticated access for local dev.
 */

import type { FastifyInstance } from 'fastify';
import { getPool } from '../../db/pool.js';
import { DASHBOARD_METRICS_KEY } from '../../cache/keys.js';
import { cacheGet, cacheSet } from '../../cache/store.js';

const CACHE_TTL = 30;

function hasUserAuth(): boolean {
  return !!(process.env.USER_JWT_SECRET ?? process.env.JWT_SECRET);
}

export async function dashboardRoutes(app: FastifyInstance): Promise<void> {
  const preHandler = hasUserAuth() ? [app.requireUserAuth()] : [];
  app.get('/metrics', {
    preHandler,
  }, async (request, reply) => {
    const cached = await cacheGet<Record<string, unknown>>(DASHBOARD_METRICS_KEY);
    if (cached) {
      return reply.send({
        request_id: request.id,
        timestamp: new Date().toISOString(),
        data: cached,
      });
    }
    const pool = getPool();
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [agentsRes, tracesRes, approvalsRes, recentRes, violationsRes] = await Promise.all([
      pool.query(
        `SELECT status, COUNT(*)::int AS c FROM agents GROUP BY status`
      ),
      pool.query(
        `SELECT status, COUNT(*)::int AS c FROM traces WHERE request_timestamp >= $1 GROUP BY status`,
        [since24h]
      ),
      pool.query(
        `SELECT COUNT(*)::int AS c FROM approval_requests WHERE status = 'pending'`
      ),
      pool.query(
        `SELECT t.id, t.agent_id, t.action_type, t.status, t.request_timestamp, a.name AS agent_name
         FROM traces t LEFT JOIN agents a ON a.id = t.agent_id
         ORDER BY t.request_timestamp DESC LIMIT 20`
      ),
      pool.query(
        `SELECT t.id, t.agent_id, t.action_type, t.status, a.name AS agent_name
         FROM traces t LEFT JOIN agents a ON a.id = t.agent_id
         WHERE t.status = 'denied' ORDER BY t.request_timestamp DESC LIMIT 5`
      ),
    ]);

    const agentsByStatus: Record<string, number> = { active: 0, disabled: 0, suspended: 0 };
    for (const row of agentsRes.rows as { status: string; c: number }[]) {
      agentsByStatus[row.status] = row.c;
    }
    const actions24h: Record<string, number> = { success: 0, denied: 0, failed: 0, pending: 0 };
    for (const row of tracesRes.rows as { status: string; c: number }[]) {
      actions24h[row.status] = row.c;
    }
    const pending_approvals = (approvalsRes.rows[0] as { c: number })?.c ?? 0;
    const recent_activity = (recentRes.rows as Record<string, unknown>[]).map((r) => ({
      id: r.id,
      agent_id: r.agent_id,
      agent_name: r.agent_name,
      action_type: r.action_type,
      status: r.status,
      request_timestamp: r.request_timestamp,
    }));
    const recent_violations = (violationsRes.rows as Record<string, unknown>[]).map((r) => ({
      id: r.id,
      agent_id: r.agent_id,
      agent_name: r.agent_name,
      action_type: r.action_type,
      status: r.status,
    }));

    const data = {
      agents_by_status: agentsByStatus,
      actions_24h: actions24h,
      pending_approvals,
      recent_activity,
      recent_violations,
    };
    await cacheSet(DASHBOARD_METRICS_KEY, data, CACHE_TTL);

    return reply.send({
      request_id: request.id,
      timestamp: new Date().toISOString(),
      data,
    });
  });
}
