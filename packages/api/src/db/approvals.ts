/**
 * Approval requests (WO-34, 35, 36, 37).
 */

import type { PoolClient } from 'pg';
import { getPool } from './pool.js';

const COLS = 'id, trace_id, proposal_id, agent_id, action_type, action_summary, status, approver_roles, assigned_approvers, approver_id, approval_token, decision_reason, decided_at, expires_at, escalated, escalated_at, created_at, updated_at';

function toTimestamp(v: unknown): string {
  if (v instanceof Date) return v.toISOString();
  return String(v ?? '');
}

export interface ApprovalRequestRow {
  id: string;
  trace_id: string;
  proposal_id: string;
  agent_id: string;
  action_type: string;
  action_summary: string;
  status: string;
  approver_roles: string[];
  assigned_approvers: string[];
  approver_id: string | null;
  approval_token: string | null;
  decision_reason: string | null;
  decided_at: string | null;
  expires_at: string;
  escalated: boolean;
  escalated_at: string | null;
  created_at: string;
  updated_at: string;
}

function mapRow(row: Record<string, unknown>): ApprovalRequestRow {
  return {
    id: row.id as string,
    trace_id: row.trace_id as string,
    proposal_id: row.proposal_id as string,
    agent_id: row.agent_id as string,
    action_type: row.action_type as string,
    action_summary: row.action_summary as string,
    status: row.status as string,
    approver_roles: Array.isArray(row.approver_roles) ? (row.approver_roles as string[]) : [],
    assigned_approvers: Array.isArray(row.assigned_approvers) ? (row.assigned_approvers as string[]) : [],
    approver_id: row.approver_id as string | null,
    approval_token: row.approval_token as string | null,
    decision_reason: row.decision_reason as string | null,
    decided_at: row.decided_at ? toTimestamp(row.decided_at) : null,
    expires_at: toTimestamp(row.expires_at),
    escalated: Boolean(row.escalated),
    escalated_at: row.escalated_at ? toTimestamp(row.escalated_at) : null,
    created_at: toTimestamp(row.created_at),
    updated_at: toTimestamp(row.updated_at),
  };
}

export async function createApprovalRequest(
  data: {
    id: string;
    trace_id: string;
    proposal_id: string;
    agent_id: string;
    action_type: string;
    action_summary: string;
    approver_roles: string[];
    assigned_approvers?: string[] | null;
    expires_at: Date;
  },
  client?: PoolClient
): Promise<ApprovalRequestRow> {
  const db = client ?? getPool();
  await db.query(
    `INSERT INTO approval_requests (id, trace_id, proposal_id, agent_id, action_type, action_summary, status, approver_roles, assigned_approvers, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8, $9)`,
    [
      data.id,
      data.trace_id,
      data.proposal_id,
      data.agent_id,
      data.action_type,
      data.action_summary,
      data.approver_roles,
      data.assigned_approvers ?? [],
      data.expires_at.toISOString(),
    ]
  );
  const out = await getApprovalById(data.id, client);
  if (!out) throw new Error('Approval not found after create');
  return out;
}

export async function getApprovalById(id: string, client?: PoolClient): Promise<ApprovalRequestRow | null> {
  const db = client ?? getPool();
  const res = await db.query(`SELECT ${COLS} FROM approval_requests WHERE id = $1`, [id]);
  if (res.rows.length === 0) return null;
  return mapRow(res.rows[0] as Record<string, unknown>);
}

export async function listApprovals(
  filters: { status?: string; approver_id?: string; approver_role?: string },
  pagination: { page: number; pageSize: number },
  client?: PoolClient
): Promise<{ items: ApprovalRequestRow[]; total: number }> {
  const db = client ?? getPool();
  const parts: string[] = ['WHERE 1=1'];
  const params: unknown[] = [];
  if (filters.status) {
    parts.push(` AND status = $${params.length + 1}`);
    params.push(filters.status);
  }
  if (filters.approver_id) {
    parts.push(` AND $${params.length + 1} = ANY(assigned_approvers)`);
    params.push(filters.approver_id);
  }
  if (filters.approver_role) {
    parts.push(` AND $${params.length + 1} = ANY(approver_roles)`);
    params.push(filters.approver_role);
  }
  const whereSql = parts.join('');
  const countRes = await db.query(`SELECT COUNT(*)::int AS total FROM approval_requests ${whereSql}`, params);
  const total = (countRes.rows[0] as { total: number })?.total ?? 0;
  const limit = Math.min(50, Math.max(1, pagination.pageSize));
  const offset = (Math.max(1, pagination.page) - 1) * limit;
  const res = await db.query(
    `SELECT ${COLS} FROM approval_requests ${whereSql} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );
  const items = (res.rows as Record<string, unknown>[]).map(mapRow);
  return { items, total };
}

export async function setApprovalDecision(
  id: string,
  decision: 'approved' | 'denied' | 'expired',
  data: { approver_id?: string | null; decision_reason?: string | null },
  client?: PoolClient
): Promise<ApprovalRequestRow | null> {
  const db = client ?? getPool();
  const now = new Date().toISOString();
  await db.query(
    `UPDATE approval_requests SET status = $1, approver_id = $2, decision_reason = $3, decided_at = $4, updated_at = $4 WHERE id = $5`,
    [decision, data.approver_id ?? null, data.decision_reason ?? null, now, id]
  );
  return getApprovalById(id, client);
}

export async function getExpiredPendingApprovals(client?: PoolClient): Promise<ApprovalRequestRow[]> {
  const db = client ?? getPool();
  const res = await db.query(
    `SELECT ${COLS} FROM approval_requests WHERE status = 'pending' AND expires_at < NOW()`
  );
  return (res.rows as Record<string, unknown>[]).map(mapRow);
}
