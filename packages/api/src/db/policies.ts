/**
 * Policy repository: CRUD, list with filters, disable/enable via version status.
 */

import type { PoolClient } from 'pg';
import { getPool } from './pool.js';
import { withTransaction } from './transaction.js';
import type { Policy, PolicyVersion } from '@ai-governance/shared';
import type { PolicyListFilters } from '@ai-governance/shared';
import type { PaginatedResult, ListOptions } from './repository.js';
import { buildPagination, buildOrderBy, addWhereEq, addWhereLike } from './query-utils.js';
import type { CreatePolicyRequest, UpdatePolicyRequest, PolicyRule } from '@ai-governance/shared';

const POLICY_COLS = 'id, name, description, current_version_id, created_at, updated_at, created_by, updated_by';
const VERSION_COLS = 'id, policy_id, version_number, status, rules, effect, priority, requires_validation, validation_types, requires_approval, approver_roles, change_reason, created_at, created_by';

function toTimestamp(v: unknown): string {
  if (v instanceof Date) return v.toISOString();
  return String(v ?? '');
}

function mapPolicy(row: Record<string, unknown>): Policy {
  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string,
    current_version_id: row.current_version_id as string | null,
    created_at: toTimestamp(row.created_at),
    updated_at: toTimestamp(row.updated_at),
    created_by: row.created_by as string | null,
    updated_by: row.updated_by as string | null,
  };
}

function mapVersion(row: Record<string, unknown>): PolicyVersion {
  return {
    id: row.id as string,
    policy_id: row.policy_id as string,
    version_number: Number(row.version_number),
    status: row.status as PolicyVersion['status'],
    rules: (row.rules as Record<string, unknown>) ?? {},
    effect: row.effect as PolicyVersion['effect'],
    priority: Number(row.priority),
    requires_validation: Boolean(row.requires_validation),
    validation_types: Array.isArray(row.validation_types) ? (row.validation_types as string[]) : [],
    requires_approval: Boolean(row.requires_approval),
    approver_roles: Array.isArray(row.approver_roles) ? (row.approver_roles as string[]) : [],
    change_reason: row.change_reason as string | null,
    created_at: toTimestamp(row.created_at),
    created_by: row.created_by as string | null,
  };
}

export interface PolicyWithVersion extends Policy {
  version?: PolicyVersion | null;
}

export async function getPolicyById(id: string, client?: PoolClient): Promise<PolicyWithVersion | null> {
  const db = client ?? getPool();
  const policyRes = await db.query(`SELECT ${POLICY_COLS} FROM policies WHERE id = $1`, [id]);
  if (policyRes.rows.length === 0) return null;
  const policy = mapPolicy(policyRes.rows[0] as Record<string, unknown>);
  const vid = policy.current_version_id;
  if (!vid) return { ...policy, version: null };
  const verRes = await db.query(`SELECT ${VERSION_COLS} FROM policy_versions WHERE id = $1`, [vid]);
  const version = verRes.rows.length > 0 ? mapVersion(verRes.rows[0] as Record<string, unknown>) : null;
  return { ...policy, version };
}

export async function listPolicies(
  options: ListOptions & { filters?: PolicyListFilters },
  client?: PoolClient
): Promise<PaginatedResult<Policy & { status?: string }>> {
  const db = client ?? getPool();
  const { pagination, sort, filters = {} } = options;
  const whereParts: string[] = ['WHERE 1=1'];
  const params: unknown[] = [];
  if (filters.status) {
    whereParts.push(' AND p.current_version_id IN (SELECT id FROM policy_versions WHERE status = $' + (params.length + 1) + ')');
    params.push(filters.status);
  }
  addWhereLike(whereParts, params, 'p.name', filters.name ?? '');
  const whereSql = whereParts.join('');

  const countRes = await db.query(
    'SELECT COUNT(*)::int AS total FROM policies p ' + whereSql,
    params
  );
  const total = (countRes.rows[0] as { total: number })?.total ?? 0;

  const allowedSort = new Set(['created_at', 'updated_at', 'name']);
  const order = buildOrderBy(sort, allowedSort);
  const orderSql = order.sql ? order.sql.replace(/ORDER BY "/, 'ORDER BY p."') : '';
  const page = buildPagination(pagination);
  const policyCols = POLICY_COLS.split(', ').map((c) => 'p.' + c.trim()).join(', ');
  const sql = 'SELECT ' + policyCols + ', pv.status AS version_status FROM policies p LEFT JOIN policy_versions pv ON p.current_version_id = pv.id ' + whereSql + orderSql + page.sql;
  const allParams = [...params, ...order.values, ...page.values];
  const res = await db.query(sql, allParams);
  const items = (res.rows as Record<string, unknown>[]).map((r) => ({ ...mapPolicy(r), status: r.version_status as string | undefined }));

  return {
    items,
    total,
    page: pagination.page,
    pageSize: pagination.pageSize,
    hasMore: pagination.page * pagination.pageSize < total,
  };
}

export async function createPolicy(
  data: CreatePolicyRequest,
  createdBy?: string | null,
  client?: PoolClient
): Promise<PolicyWithVersion> {
  const run = async (c: PoolClient) => {
    const policyId = crypto.randomUUID();
    const versionId = crypto.randomUUID();
    await c.query(
      `INSERT INTO policies (id, name, description, current_version_id, created_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [policyId, data.name, data.description, versionId, createdBy ?? null]
    );
    await c.query(
      `INSERT INTO policy_versions (id, policy_id, version_number, status, rules, effect, priority, requires_validation, validation_types, requires_approval, approver_roles, created_by)
       VALUES ($1, $2, 1, 'active', $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
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
      ]
    );
    const out = await getPolicyById(policyId, c);
    if (!out) throw new Error('Policy not found after create');
    return out;
  };
  if (client) return run(client);
  return withTransaction(run);
}

export async function updatePolicy(
  id: string,
  data: UpdatePolicyRequest,
  updatedBy?: string | null,
  client?: PoolClient
): Promise<PolicyWithVersion | null> {
  const db = client ?? getPool();
  const existing = await getPolicyById(id, client);
  if (!existing?.version) return null;

  const updates: string[] = [];
  const params: unknown[] = [];
  let idx = 1;
  if (data.description !== undefined) {
    updates.push(`description = $${idx++}`);
    params.push(data.description);
  }
  if (updates.length > 0) {
    params.push(id);
    await db.query(`UPDATE policies SET ${updates.join(', ')}, updated_at = NOW(), updated_by = $${idx} WHERE id = $${idx + 1}`, [...params, updatedBy ?? null, id]);
  }

  const hasVersionChange =
    data.rules !== undefined ||
    data.effect !== undefined ||
    data.priority !== undefined ||
    data.requires_validation !== undefined ||
    data.validation_types !== undefined ||
    data.requires_approval !== undefined ||
    data.approver_roles !== undefined;

  if (hasVersionChange) {
    const newVersionId = crypto.randomUUID();
    const nextVer = existing.version.version_number + 1;
    const rules = data.rules ?? (existing.version.rules as unknown as PolicyRule[]);
    const effect = data.effect ?? existing.version.effect;
    const priority = data.priority ?? existing.version.priority;
    const requires_validation = data.requires_validation ?? existing.version.requires_validation;
    const validation_types = data.validation_types ?? existing.version.validation_types;
    const requires_approval = data.requires_approval ?? existing.version.requires_approval;
    const approver_roles = data.approver_roles ?? existing.version.approver_roles;

    await db.query(
      `INSERT INTO policy_versions (id, policy_id, version_number, status, rules, effect, priority, requires_validation, validation_types, requires_approval, approver_roles, created_by)
       VALUES ($1, $2, $3, 'active', $4, $5, $6, $7, $8, $9, $10, $11)`,
      [newVersionId, id, nextVer, JSON.stringify(rules), effect, priority, requires_validation, validation_types, requires_approval, approver_roles, updatedBy ?? null]
    );
    await db.query(
      `UPDATE policies SET current_version_id = $1, updated_at = NOW(), updated_by = $2 WHERE id = $3`,
      [newVersionId, updatedBy ?? null, id]
    );
  }

  return getPolicyById(id, client);
}

export async function setPolicyVersionStatus(
  policyId: string,
  status: 'active' | 'disabled',
  client?: PoolClient
): Promise<PolicyWithVersion | null> {
  const db = client ?? getPool();
  const policy = await getPolicyById(policyId, client);
  if (!policy?.current_version_id) return null;
  await db.query(
    `UPDATE policy_versions SET status = $1 WHERE id = $2`,
    [status, policy.current_version_id]
  );
  return getPolicyById(policyId, client);
}

export async function findPolicyByName(name: string, client?: PoolClient): Promise<Policy | null> {
  const db = client ?? getPool();
  const res = await db.query(`SELECT ${POLICY_COLS} FROM policies WHERE name = $1`, [name]);
  if (res.rows.length === 0) return null;
  return mapPolicy(res.rows[0] as Record<string, unknown>);
}

/** List active policy versions for evaluation (by priority desc). */
export async function listActivePolicyVersions(client?: PoolClient): Promise<PolicyVersion[]> {
  const db = client ?? getPool();
  const res = await db.query(
    `SELECT pv.${VERSION_COLS} FROM policy_versions pv
     INNER JOIN policies p ON p.current_version_id = pv.id
     WHERE pv.status = 'active'
     ORDER BY pv.priority DESC`
  );
  return (res.rows as Record<string, unknown>[]).map(mapVersion);
}
