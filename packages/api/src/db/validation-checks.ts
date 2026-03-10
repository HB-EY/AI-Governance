/**
 * Validation check repository (WO-29).
 */

import type { PoolClient } from 'pg';
import { getPool } from './pool.js';
import type { CreateValidationCheckRequest, UpdateValidationCheckRequest } from '@ai-governance/shared';

const COLS = 'id, name, check_type, description, configuration, status, timeout_seconds, created_at, updated_at, created_by, updated_by';

function toTimestamp(v: unknown): string {
  if (v instanceof Date) return v.toISOString();
  return String(v ?? '');
}

export interface ValidationCheckRow {
  id: string;
  name: string;
  check_type: string;
  description: string;
  configuration: Record<string, unknown>;
  status: string;
  timeout_seconds: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

function mapRow(row: Record<string, unknown>): ValidationCheckRow {
  return {
    id: row.id as string,
    name: row.name as string,
    check_type: row.check_type as string,
    description: row.description as string,
    configuration: (row.configuration as Record<string, unknown>) ?? {},
    status: row.status as string,
    timeout_seconds: Number(row.timeout_seconds),
    created_at: toTimestamp(row.created_at),
    updated_at: toTimestamp(row.updated_at),
    created_by: row.created_by as string | null,
    updated_by: row.updated_by as string | null,
  };
}

export async function getValidationCheckById(id: string, client?: PoolClient): Promise<ValidationCheckRow | null> {
  const db = client ?? getPool();
  const res = await db.query(`SELECT ${COLS} FROM validation_checks WHERE id = $1`, [id]);
  if (res.rows.length === 0) return null;
  return mapRow(res.rows[0] as Record<string, unknown>);
}

export async function listValidationChecks(
  filters: { check_type?: string; status?: string },
  client?: PoolClient
): Promise<ValidationCheckRow[]> {
  const db = client ?? getPool();
  const parts: string[] = ['SELECT ' + COLS + ' FROM validation_checks WHERE 1=1'];
  const params: unknown[] = [];
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
  return (res.rows as Record<string, unknown>[]).map(mapRow);
}

export async function createValidationCheck(
  data: CreateValidationCheckRequest,
  createdBy?: string | null,
  client?: PoolClient
): Promise<ValidationCheckRow> {
  const db = client ?? getPool();
  const id = crypto.randomUUID();
  await db.query(
    `INSERT INTO validation_checks (id, name, check_type, description, configuration, status, timeout_seconds, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, 'active', $6, $7, $7)`,
    [
      id,
      data.name,
      data.check_type,
      data.description,
      JSON.stringify(data.configuration ?? {}),
      data.timeout_seconds ?? 5,
      createdBy ?? null,
    ]
  );
  const out = await getValidationCheckById(id, client);
  if (!out) throw new Error('Validation check not found after create');
  return out;
}

export async function updateValidationCheck(
  id: string,
  data: UpdateValidationCheckRequest,
  updatedBy?: string | null,
  client?: PoolClient
): Promise<ValidationCheckRow | null> {
  const db = client ?? getPool();
  const updates: string[] = [];
  const params: unknown[] = [];
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
  if (updates.length === 0) return getValidationCheckById(id, client);
  updates.push(`updated_at = NOW()`, `updated_by = $${idx++}`);
  params.push(updatedBy ?? null, id);
  await db.query(`UPDATE validation_checks SET ${updates.join(', ')} WHERE id = $${idx}`, params);
  return getValidationCheckById(id, client);
}

export async function setValidationCheckStatus(id: string, status: 'active' | 'disabled', client?: PoolClient): Promise<ValidationCheckRow | null> {
  return updateValidationCheck(id, { status }, undefined, client);
}

export async function findValidationCheckByName(name: string, client?: PoolClient): Promise<ValidationCheckRow | null> {
  const db = client ?? getPool();
  const res = await db.query(`SELECT ${COLS} FROM validation_checks WHERE name = $1`, [name]);
  if (res.rows.length === 0) return null;
  return mapRow(res.rows[0] as Record<string, unknown>);
}
