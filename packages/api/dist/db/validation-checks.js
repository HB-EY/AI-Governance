/**
 * Validation check repository (WO-29).
 */
import { getPool } from './pool.js';
const COLS = 'id, name, check_type, description, configuration, status, timeout_seconds, created_at, updated_at, created_by, updated_by';
function toTimestamp(v) {
    if (v instanceof Date)
        return v.toISOString();
    return String(v ?? '');
}
function mapRow(row) {
    return {
        id: row.id,
        name: row.name,
        check_type: row.check_type,
        description: row.description,
        configuration: row.configuration ?? {},
        status: row.status,
        timeout_seconds: Number(row.timeout_seconds),
        created_at: toTimestamp(row.created_at),
        updated_at: toTimestamp(row.updated_at),
        created_by: row.created_by,
        updated_by: row.updated_by,
    };
}
export async function getValidationCheckById(id, client) {
    const db = client ?? getPool();
    const res = await db.query(`SELECT ${COLS} FROM validation_checks WHERE id = $1`, [id]);
    if (res.rows.length === 0)
        return null;
    return mapRow(res.rows[0]);
}
export async function listValidationChecks(filters, client) {
    const db = client ?? getPool();
    const parts = ['SELECT ' + COLS + ' FROM validation_checks WHERE 1=1'];
    const params = [];
    if (filters.check_type) {
        parts.push(' AND check_type = $' + (params.length + 1));
        params.push(filters.check_type);
    }
    if (filters.status) {
        parts.push(' AND status = $' + (params.length + 1));
        params.push(filters.status);
    }
    parts.push(' ORDER BY name');
    const res = await db.query(parts.join(''), params);
    return res.rows.map(mapRow);
}
export async function createValidationCheck(data, createdBy, client) {
    const db = client ?? getPool();
    const id = crypto.randomUUID();
    await db.query(`INSERT INTO validation_checks (id, name, check_type, description, configuration, status, timeout_seconds, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, 'active', $6, $7, $7)`, [
        id,
        data.name,
        data.check_type,
        data.description,
        JSON.stringify(data.configuration ?? {}),
        data.timeout_seconds ?? 5,
        createdBy ?? null,
    ]);
    const out = await getValidationCheckById(id, client);
    if (!out)
        throw new Error('Validation check not found after create');
    return out;
}
export async function updateValidationCheck(id, data, updatedBy, client) {
    const db = client ?? getPool();
    const updates = [];
    const params = [];
    let idx = 1;
    if (data.description !== undefined) {
        updates.push(`description = $${idx++}`);
        params.push(data.description);
    }
    if (data.configuration !== undefined) {
        updates.push(`configuration = $${idx++}`);
        params.push(JSON.stringify(data.configuration));
    }
    if (data.status !== undefined) {
        updates.push(`status = $${idx++}`);
        params.push(data.status);
    }
    if (data.timeout_seconds !== undefined) {
        updates.push(`timeout_seconds = $${idx++}`);
        params.push(data.timeout_seconds);
    }
    if (updates.length === 0)
        return getValidationCheckById(id, client);
    updates.push(`updated_at = NOW()`, `updated_by = $${idx++}`);
    params.push(updatedBy ?? null, id);
    await db.query(`UPDATE validation_checks SET ${updates.join(', ')} WHERE id = $${idx}`, params);
    return getValidationCheckById(id, client);
}
export async function setValidationCheckStatus(id, status, client) {
    return updateValidationCheck(id, { status }, undefined, client);
}
export async function findValidationCheckByName(name, client) {
    const db = client ?? getPool();
    const res = await db.query(`SELECT ${COLS} FROM validation_checks WHERE name = $1`, [name]);
    if (res.rows.length === 0)
        return null;
    return mapRow(res.rows[0]);
}
