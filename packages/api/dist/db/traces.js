/**
 * Trace repository: create, get by id, list with filters (WO-25, WO-27).
 */
import { getPool } from './pool.js';
import { buildPagination, buildOrderBy, addWhereEq } from './query-utils.js';
const TRACE_COLS = 'id, run_id, agent_id, agent_version_id, action_type, target_resource, status, context, reasoning, proposal_id, request_payload, request_timestamp, completed_at, created_at';
function toTimestamp(v) {
    if (v instanceof Date)
        return v.toISOString();
    return String(v ?? '');
}
function mapRow(row) {
    return {
        id: row.id,
        run_id: row.run_id,
        agent_id: row.agent_id,
        agent_version_id: row.agent_version_id,
        action_type: row.action_type,
        target_resource: row.target_resource,
        status: row.status,
        context: row.context ?? null,
        reasoning: row.reasoning,
        proposal_id: row.proposal_id,
        request_payload: row.request_payload ?? null,
        request_timestamp: toTimestamp(row.request_timestamp),
        completed_at: row.completed_at ? toTimestamp(row.completed_at) : null,
        created_at: toTimestamp(row.created_at),
    };
}
export async function getTraceById(id, client) {
    const db = client ?? getPool();
    const res = await db.query(`SELECT ${TRACE_COLS} FROM traces WHERE id = $1`, [id]);
    if (res.rows.length === 0)
        return null;
    return mapRow(res.rows[0]);
}
export async function createTrace(data, client) {
    const db = client ?? getPool();
    await db.query(`INSERT INTO traces (id, run_id, agent_id, agent_version_id, action_type, target_resource, status, context, reasoning, request_payload, request_timestamp, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8, $9, NOW(), NOW())`, [
        data.id,
        data.run_id ?? null,
        data.agent_id,
        data.agent_version_id,
        data.action_type,
        data.target_resource,
        data.context ? JSON.stringify(data.context) : null,
        data.reasoning ?? null,
        data.request_payload ? JSON.stringify(data.request_payload) : null,
    ]);
    const out = await getTraceById(data.id, client);
    if (!out)
        throw new Error('Trace not found after create');
    return out;
}
export async function updateTraceStatus(id, status, client) {
    const db = client ?? getPool();
    await db.query(`UPDATE traces SET status = $1, completed_at = CASE WHEN $1 IN ('success', 'denied', 'failed') THEN NOW() ELSE completed_at END WHERE id = $2`, [status, id]);
    return getTraceById(id, client);
}
export async function listTraces(options, client) {
    const db = client ?? getPool();
    const { pagination, sort, filters = {} } = options;
    const whereParts = ['WHERE 1=1'];
    const params = [];
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
    const total = countRes.rows[0]?.total ?? 0;
    const allowedSort = new Set(['request_timestamp', 'created_at', 'status']);
    const order = buildOrderBy(sort, allowedSort);
    const page = buildPagination(pagination);
    const sql = 'SELECT ' + TRACE_COLS + ' FROM traces ' + whereSql + order.sql + page.sql;
    const allParams = [...params, ...order.values, ...page.values];
    const res = await db.query(sql, allParams);
    const items = res.rows.map(mapRow);
    return {
        items,
        total,
        page: pagination.page,
        pageSize: pagination.pageSize,
        hasMore: pagination.page * pagination.pageSize < total,
    };
}
