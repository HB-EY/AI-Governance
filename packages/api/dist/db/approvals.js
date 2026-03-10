/**
 * Approval requests (WO-34, 35, 36, 37).
 */
import { getPool } from './pool.js';
const COLS = 'id, trace_id, proposal_id, agent_id, action_type, action_summary, status, approver_roles, assigned_approvers, approver_id, approval_token, decision_reason, decided_at, expires_at, escalated, escalated_at, created_at, updated_at';
function toTimestamp(v) {
    if (v instanceof Date)
        return v.toISOString();
    return String(v ?? '');
}
function mapRow(row) {
    return {
        id: row.id,
        trace_id: row.trace_id,
        proposal_id: row.proposal_id,
        agent_id: row.agent_id,
        action_type: row.action_type,
        action_summary: row.action_summary,
        status: row.status,
        approver_roles: Array.isArray(row.approver_roles) ? row.approver_roles : [],
        assigned_approvers: Array.isArray(row.assigned_approvers) ? row.assigned_approvers : [],
        approver_id: row.approver_id,
        approval_token: row.approval_token,
        decision_reason: row.decision_reason,
        decided_at: row.decided_at ? toTimestamp(row.decided_at) : null,
        expires_at: toTimestamp(row.expires_at),
        escalated: Boolean(row.escalated),
        escalated_at: row.escalated_at ? toTimestamp(row.escalated_at) : null,
        created_at: toTimestamp(row.created_at),
        updated_at: toTimestamp(row.updated_at),
    };
}
export async function createApprovalRequest(data, client) {
    const db = client ?? getPool();
    await db.query(`INSERT INTO approval_requests (id, trace_id, proposal_id, agent_id, action_type, action_summary, status, approver_roles, assigned_approvers, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8, $9)`, [
        data.id,
        data.trace_id,
        data.proposal_id,
        data.agent_id,
        data.action_type,
        data.action_summary,
        data.approver_roles,
        data.assigned_approvers ?? [],
        data.expires_at.toISOString(),
    ]);
    const out = await getApprovalById(data.id, client);
    if (!out)
        throw new Error('Approval not found after create');
    return out;
}
export async function getApprovalById(id, client) {
    const db = client ?? getPool();
    const res = await db.query(`SELECT ${COLS} FROM approval_requests WHERE id = $1`, [id]);
    if (res.rows.length === 0)
        return null;
    return mapRow(res.rows[0]);
}
export async function listApprovals(filters, pagination, client) {
    const db = client ?? getPool();
    const parts = ['WHERE 1=1'];
    const params = [];
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
    const total = countRes.rows[0]?.total ?? 0;
    const limit = Math.min(50, Math.max(1, pagination.pageSize));
    const offset = (Math.max(1, pagination.page) - 1) * limit;
    const res = await db.query(`SELECT ${COLS} FROM approval_requests ${whereSql} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, limit, offset]);
    const items = res.rows.map(mapRow);
    return { items, total };
}
export async function setApprovalDecision(id, decision, data, client) {
    const db = client ?? getPool();
    const now = new Date().toISOString();
    await db.query(`UPDATE approval_requests SET status = $1, approver_id = $2, decision_reason = $3, decided_at = $4, updated_at = $4 WHERE id = $5`, [decision, data.approver_id ?? null, data.decision_reason ?? null, now, id]);
    return getApprovalById(id, client);
}
export async function getExpiredPendingApprovals(client) {
    const db = client ?? getPool();
    const res = await db.query(`SELECT ${COLS} FROM approval_requests WHERE status = 'pending' AND expires_at < NOW()`);
    return res.rows.map(mapRow);
}
