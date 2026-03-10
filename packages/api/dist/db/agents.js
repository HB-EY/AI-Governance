/**
 * Agent repository: CRUD, list with filters, status updates.
 */
import { getPool } from './pool.js';
import { withTransaction } from './transaction.js';
import { buildPagination, buildOrderBy, addWhereEq, addWhereLike } from './query-utils.js';
const AGENT_COLS = 'id, name, description, owner_id, owner_email, status, current_version_id, api_key_hash, created_at, updated_at, created_by, updated_by, last_active_at';
function mapRow(row) {
    return {
        id: row.id,
        name: row.name,
        description: row.description,
        owner_id: row.owner_id,
        owner_email: row.owner_email,
        status: row.status ?? 'active',
        current_version_id: row.current_version_id,
        api_key_hash: row.api_key_hash,
        created_at: row.created_at?.toISOString?.() ?? row.created_at,
        updated_at: row.updated_at?.toISOString?.() ?? row.updated_at,
        created_by: row.created_by,
        updated_by: row.updated_by,
        last_active_at: row.last_active_at ? row.last_active_at.toISOString() : null,
    };
}
export async function getAgentById(id, client) {
    const db = client ?? getPool();
    const res = await db.query(`SELECT ${AGENT_COLS} FROM agents WHERE id = $1`, [id]);
    if (res.rows.length === 0)
        return null;
    return mapRow(res.rows[0]);
}
export async function listAgents(options, client) {
    const db = client ?? getPool();
    const { pagination, sort, filters = {} } = options;
    const whereParts = ['WHERE 1=1'];
    const params = [];
    addWhereEq(whereParts, params, 'status', filters.status);
    addWhereLike(whereParts, params, 'owner_id', filters.owner_id ?? '');
    addWhereLike(whereParts, params, 'name', filters.name ?? '');
    const whereSql = whereParts.join('');
    const countRes = await db.query('SELECT COUNT(*)::int AS total FROM agents ' + whereSql, params);
    const total = countRes.rows[0]?.total ?? 0;
    const allowedSort = new Set(['created_at', 'updated_at', 'name', 'last_active_at']);
    const order = buildOrderBy(sort, allowedSort);
    const page = buildPagination(pagination);
    const sql = 'SELECT ' + AGENT_COLS + ' FROM agents ' + whereSql + order.sql + page.sql;
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
/** Create agent and first version in a transaction; returns agent. */
export async function createAgent(data, capabilities) {
    return withTransaction(async (client) => {
        await client.query(`INSERT INTO agents (id, name, description, owner_id, owner_email, api_key_hash, created_by, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')`, [
            data.id,
            data.name,
            data.description ?? null,
            data.owner_id,
            data.owner_email ?? null,
            data.api_key_hash,
            data.created_by ?? null,
        ]);
        const versionId = crypto.randomUUID();
        await client.query(`INSERT INTO agent_versions (id, agent_id, version_number, status, purpose, risk_tier, capabilities)
       VALUES ($1, $2, 1, 'active', 'Initial registration', 'low', $3)`, [versionId, data.id, capabilities]);
        await client.query(`UPDATE agents SET current_version_id = $1, updated_at = NOW() WHERE id = $2`, [versionId, data.id]);
        const out = await getAgentById(data.id, client);
        if (!out)
            throw new Error('Agent not found after create');
        return out;
    });
}
export async function updateAgentMetadata(id, data, client) {
    const db = client ?? getPool();
    const updates = [];
    const params = [];
    let idx = 1;
    if (data.description !== undefined) {
        updates.push(`description = $${idx++}`);
        params.push(data.description);
    }
    if (data.owner_id !== undefined) {
        updates.push(`owner_id = $${idx++}`);
        params.push(data.owner_id);
    }
    if (data.owner_email !== undefined) {
        updates.push(`owner_email = $${idx++}`);
        params.push(data.owner_email);
    }
    if (updates.length === 0 && !data.capabilities?.length)
        return getAgentById(id, client);
    updates.push(`updated_at = NOW()`);
    params.push(id);
    await db.query(`UPDATE agents SET ${updates.join(', ')} WHERE id = $${idx}`, params);
    if (data.capabilities && data.capabilities.length > 0) {
        const versionId = crypto.randomUUID();
        const agent = await getAgentById(id, client);
        const currentVersion = agent?.current_version_id;
        const nextVersion = currentVersion ? await getNextVersionNumber(id, client) : 1;
        await db.query(`INSERT INTO agent_versions (id, agent_id, version_number, status, purpose, risk_tier, capabilities)
       VALUES ($1, $2, $3, 'active', 'Capability update', 'low', $4)`, [versionId, id, nextVersion, data.capabilities]);
        await db.query(`UPDATE agents SET current_version_id = $1, updated_at = NOW() WHERE id = $2`, [versionId, id]);
    }
    return getAgentById(id, client);
}
async function getNextVersionNumber(agentId, client) {
    const db = client ?? getPool();
    const res = await db.query('SELECT COALESCE(MAX(version_number), 0) + 1 AS n FROM agent_versions WHERE agent_id = $1', [agentId]);
    return res.rows[0]?.n ?? 1;
}
export async function updateAgentStatus(id, status, client) {
    const db = client ?? getPool();
    await db.query(`UPDATE agents SET status = $1, updated_at = NOW() WHERE id = $2`, [status, id]);
    return getAgentById(id, client);
}
export async function findAgentByName(name, client) {
    const db = client ?? getPool();
    const res = await db.query(`SELECT ${AGENT_COLS} FROM agents WHERE name = $1`, [name]);
    if (res.rows.length === 0)
        return null;
    return mapRow(res.rows[0]);
}
