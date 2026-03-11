/**
 * Policy repository: CRUD, list with filters, disable/enable via version status.
 */
import { getPool } from './pool.js';
import { withTransaction } from './transaction.js';
import { buildPagination, buildOrderBy, addWhereLike } from './query-utils.js';
const POLICY_COLS = 'id, name, description, current_version_id, created_at, updated_at, created_by, updated_by';
const VERSION_COLS = 'id, policy_id, version_number, status, rules, effect, priority, requires_validation, validation_types, requires_approval, approver_roles, change_reason, created_at, created_by';
function toTimestamp(v) {
    if (v instanceof Date)
        return v.toISOString();
    return String(v ?? '');
}
function mapPolicy(row) {
    return {
        id: row.id,
        name: row.name,
        description: row.description,
        current_version_id: row.current_version_id,
        created_at: toTimestamp(row.created_at),
        updated_at: toTimestamp(row.updated_at),
        created_by: row.created_by,
        updated_by: row.updated_by,
    };
}
function mapVersion(row) {
    return {
        id: row.id,
        policy_id: row.policy_id,
        version_number: Number(row.version_number),
        status: row.status,
        rules: row.rules ?? {},
        effect: row.effect,
        priority: Number(row.priority),
        requires_validation: Boolean(row.requires_validation),
        validation_types: Array.isArray(row.validation_types) ? row.validation_types : [],
        requires_approval: Boolean(row.requires_approval),
        approver_roles: Array.isArray(row.approver_roles) ? row.approver_roles : [],
        change_reason: row.change_reason,
        created_at: toTimestamp(row.created_at),
        created_by: row.created_by,
    };
}
export async function getPolicyById(id, client) {
    const db = client ?? getPool();
    const policyRes = await db.query(`SELECT ${POLICY_COLS} FROM policies WHERE id = $1`, [id]);
    if (policyRes.rows.length === 0)
        return null;
    const policy = mapPolicy(policyRes.rows[0]);
    const vid = policy.current_version_id;
    if (!vid)
        return { ...policy, version: null };
    const verRes = await db.query(`SELECT ${VERSION_COLS} FROM policy_versions WHERE id = $1`, [vid]);
    const version = verRes.rows.length > 0 ? mapVersion(verRes.rows[0]) : null;
    return { ...policy, version };
}
export async function listPolicies(options, client) {
    const db = client ?? getPool();
    const { pagination, sort, filters = {} } = options;
    const whereParts = ['WHERE 1=1'];
    const params = [];
    if (filters.status) {
        whereParts.push(' AND p.current_version_id IN (SELECT id FROM policy_versions WHERE status = $' + (params.length + 1) + ')');
        params.push(filters.status);
    }
    addWhereLike(whereParts, params, 'p.name', filters.name ?? '');
    const whereSql = whereParts.join('');
    const countRes = await db.query('SELECT COUNT(*)::int AS total FROM policies p ' + whereSql, params);
    const total = countRes.rows[0]?.total ?? 0;
    const allowedSort = new Set(['created_at', 'updated_at', 'name']);
    const order = buildOrderBy(sort, allowedSort);
    const orderSql = order.sql ? order.sql.replace(/ORDER BY "/, 'ORDER BY p."') : '';
    const page = buildPagination(pagination);
    const policyCols = POLICY_COLS.split(', ').map((c) => 'p.' + c.trim()).join(', ');
    const sql = 'SELECT ' + policyCols + ', pv.status AS version_status FROM policies p LEFT JOIN policy_versions pv ON p.current_version_id = pv.id ' + whereSql + orderSql + page.sql;
    const allParams = [...params, ...order.values, ...page.values];
    const res = await db.query(sql, allParams);
    const items = res.rows.map((r) => ({ ...mapPolicy(r), status: r.version_status }));
    return {
        items,
        total,
        page: pagination.page,
        pageSize: pagination.pageSize,
        hasMore: pagination.page * pagination.pageSize < total,
    };
}
export async function createPolicy(data, createdBy, client) {
    const run = async (c) => {
        const policyId = crypto.randomUUID();
        const versionId = crypto.randomUUID();
        // Insert policy first with current_version_id NULL (policy_versions row does not exist yet).
        await c.query(`INSERT INTO policies (id, name, description, current_version_id, created_by)
       VALUES ($1, $2, $3, NULL, $4)`, [policyId, data.name, data.description, createdBy ?? null]);
        await c.query(`INSERT INTO policy_versions (id, policy_id, version_number, status, rules, effect, priority, requires_validation, validation_types, requires_approval, approver_roles, created_by)
       VALUES ($1, $2, 1, 'active', $3, $4, $5, $6, $7, $8, $9, $10)`, [
            versionId,
            policyId,
            JSON.stringify(data.rules ?? []),
            data.effect,
            data.priority ?? 0,
            data.requires_validation ?? false,
            data.validation_types ?? [],
            data.requires_approval ?? false,
            data.approver_roles ?? [],
            createdBy ?? null,
        ]);
        await c.query(`UPDATE policies SET current_version_id = $1 WHERE id = $2`, [versionId, policyId]);
        const out = await getPolicyById(policyId, c);
        if (!out)
            throw new Error('Policy not found after create');
        return out;
    };
    if (client)
        return run(client);
    return withTransaction(run);
}
export async function updatePolicy(id, data, updatedBy, client) {
    const db = client ?? getPool();
    const existing = await getPolicyById(id, client);
    if (!existing?.version)
        return null;
    const updates = [];
    const params = [];
    let idx = 1;
    if (data.description !== undefined) {
        updates.push(`description = $${idx++}`);
        params.push(data.description);
    }
    if (updates.length > 0) {
        params.push(id);
        await db.query(`UPDATE policies SET ${updates.join(', ')}, updated_at = NOW(), updated_by = $${idx} WHERE id = $${idx + 1}`, [...params, updatedBy ?? null, id]);
    }
    const hasVersionChange = data.rules !== undefined ||
        data.effect !== undefined ||
        data.priority !== undefined ||
        data.requires_validation !== undefined ||
        data.validation_types !== undefined ||
        data.requires_approval !== undefined ||
        data.approver_roles !== undefined;
    if (hasVersionChange) {
        const newVersionId = crypto.randomUUID();
        const nextVer = existing.version.version_number + 1;
        const rules = data.rules ?? existing.version.rules;
        const effect = data.effect ?? existing.version.effect;
        const priority = data.priority ?? existing.version.priority;
        const requires_validation = data.requires_validation ?? existing.version.requires_validation;
        const validation_types = data.validation_types ?? existing.version.validation_types;
        const requires_approval = data.requires_approval ?? existing.version.requires_approval;
        const approver_roles = data.approver_roles ?? existing.version.approver_roles;
        await db.query(`INSERT INTO policy_versions (id, policy_id, version_number, status, rules, effect, priority, requires_validation, validation_types, requires_approval, approver_roles, created_by)
       VALUES ($1, $2, $3, 'active', $4, $5, $6, $7, $8, $9, $10, $11)`, [newVersionId, id, nextVer, JSON.stringify(rules), effect, priority, requires_validation, validation_types, requires_approval, approver_roles, updatedBy ?? null]);
        await db.query(`UPDATE policies SET current_version_id = $1, updated_at = NOW(), updated_by = $2 WHERE id = $3`, [newVersionId, updatedBy ?? null, id]);
    }
    return getPolicyById(id, client);
}
export async function setPolicyVersionStatus(policyId, status, client) {
    const db = client ?? getPool();
    const policy = await getPolicyById(policyId, client);
    if (!policy?.current_version_id)
        return null;
    await db.query(`UPDATE policy_versions SET status = $1 WHERE id = $2`, [status, policy.current_version_id]);
    return getPolicyById(policyId, client);
}
export async function findPolicyByName(name, client) {
    const db = client ?? getPool();
    const res = await db.query(`SELECT ${POLICY_COLS} FROM policies WHERE name = $1`, [name]);
    if (res.rows.length === 0)
        return null;
    return mapPolicy(res.rows[0]);
}
/** List active policy versions for evaluation (by priority desc). */
export async function listActivePolicyVersions(client) {
    const db = client ?? getPool();
    const pvCols = VERSION_COLS.split(', ').map((c) => `pv.${c.trim()}`).join(', ');
    const res = await db.query(`SELECT ${pvCols} FROM policy_versions pv
     INNER JOIN policies p ON p.current_version_id = pv.id
     WHERE pv.status = 'active'
     ORDER BY pv.priority DESC`);
    return res.rows.map(mapVersion);
}
