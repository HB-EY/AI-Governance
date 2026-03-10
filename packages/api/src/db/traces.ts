/**
 * Trace repository: create, get by id, list with filters (WO-25, WO-27).
 */

import type { PoolClient } from 'pg';
import { getPool } from './pool.js';
import type { Trace } from '@ai-governance/shared';
import type { TraceListFilters } from '@ai-governance/shared';
import type { PaginatedResult, ListOptions } from './repository.js';
import { buildPagination, buildOrderBy, addWhereEq, addWhereLike } from './query-utils.js';

const TRACE_COLS = 'id, run_id, agent_id, agent_version_id, action_type, target_resource, status, context, reasoning, proposal_id, request_payload, request_timestamp, completed_at, created_at';

function toTimestamp(v: unknown): string {
  if (v instanceof Date) return v.toISOString();
  return String(v ?? '');
}

function mapRow(row: Record<string, unknown>): Trace {
  return {
    id: row.id as string,
    run_id: row.run_id as string | null,
    agent_id: row.agent_id as string,
    agent_version_id: row.agent_version_id as string,
    action_type: row.action_type as string,
    target_resource: row.target_resource as string,
    status: row.status as Trace['status'],
    context: (row.context as Record<string, unknown>) ?? null,
    reasoning: row.reasoning as string | null,
    proposal_id: row.proposal_id as string | null,
    request_payload: (row.request_payload as Record<string, unknown>) ?? null,
    request_timestamp: toTimestamp(row.request_timestamp),
    completed_at: row.completed_at ? toTimestamp(row.completed_at) : null,
    created_at: toTimestamp(row.created_at),
  };
}

export async function getTraceById(id: string, client?: PoolClient): Promise<Trace | null> {
  const db = client ?? getPool();
  const res = await db.query(`SELECT ${TRACE_COLS} FROM traces WHERE id = $1`, [id]);
  if (res.rows.length === 0) return null;
  return mapRow(res.rows[0] as Record<string, unknown>);
}

export async function createTrace(
  data: {
    id: string;
    agent_id: string;
    agent_version_id: string;
    run_id?: string | null;
    action_type: string;
    target_resource: string;
    context?: Record<string, unknown> | null;
    reasoning?: string | null;
    request_payload?: Record<string, unknown> | null;
  },
  client?: PoolClient
): Promise<Trace> {
  const db = client ?? getPool();
  await db.query(
    `INSERT INTO traces (id, run_id, agent_id, agent_version_id, action_type, target_resource, status, context, reasoning, request_payload, request_timestamp, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8, $9, NOW(), NOW())`,
    [
      data.id,
      data.run_id ?? null,
      data.agent_id,
      data.agent_version_id,
      data.action_type,
      data.target_resource,
      data.context ? JSON.stringify(data.context) : null,
      data.reasoning ?? null,
      data.request_payload ? JSON.stringify(data.request_payload) : null,
    ]
  );
  const out = await getTraceById(data.id, client);
  if (!out) throw new Error('Trace not found after create');
  return out;
}

export async function updateTraceStatus(
  id: string,
  status: Trace['status'],
  client?: PoolClient
): Promise<Trace | null> {
  const db = client ?? getPool();
  await db.query(
    `UPDATE traces SET status = $1, completed_at = CASE WHEN $1 IN ('success', 'denied', 'failed') THEN NOW() ELSE completed_at END WHERE id = $2`,
    [status, id]
  );
  return getTraceById(id, client);
}

export async function listTraces(
  options: ListOptions & { filters?: TraceListFilters },
  client?: PoolClient
): Promise<PaginatedResult<Trace>> {
  const db = client ?? getPool();
  const { pagination, sort, filters = {} } = options;
  const whereParts: string[] = ['WHERE 1=1'];
  const params: unknown[] = [];
  addWhereEq(whereParts, params, 'agent_id', filters.agent_id);
  addWhereEq(whereParts, params, 'status', filters.status);
  addWhereEq(whereParts, params, 'action_type', filters.action_type);
  if (filters.from) {
    whereParts.push(` AND request_timestamp >= $${params.length + 1}`);
    params.push(filters.from);
  }
  if (filters.to) {
    whereParts.push(` AND request_timestamp <= $${params.length + 1}`);
    params.push(filters.to);
  }
  const whereSql = whereParts.join('');

  const countRes = await db.query('SELECT COUNT(*)::int AS total FROM traces ' + whereSql, params);
  const total = (countRes.rows[0] as { total: number })?.total ?? 0;

  const allowedSort = new Set(['request_timestamp', 'created_at', 'status']);
  const order = buildOrderBy(sort, allowedSort);
  const page = buildPagination(pagination);
  const sql = 'SELECT ' + TRACE_COLS + ' FROM traces ' + whereSql + order.sql + page.sql;
  const allParams = [...params, ...order.values, ...page.values];
  const res = await db.query(sql, allParams);
  const items = (res.rows as Record<string, unknown>[]).map(mapRow);

  return {
    items,
    total,
    page: pagination.page,
    pageSize: pagination.pageSize,
    hasMore: pagination.page * pagination.pageSize < total,
  };
}
