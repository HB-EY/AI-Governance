/**
 * Audit log: write entries to audit_log for agent, policy, validation_check, approval.
 */

import type { PoolClient } from 'pg';
import { getPool } from '../db/pool.js';
import type { AuditEntityType, AuditAction } from '@ai-governance/shared';

export interface AuditEntry {
  entity_type: AuditEntityType;
  entity_id: string;
  action: AuditAction;
  changes: Record<string, unknown>;
  user_id: string;
  ip_address?: string | null;
  user_agent?: string | null;
}

export async function writeAuditLog(entry: AuditEntry, client?: PoolClient): Promise<void> {
  const run = async (c: PoolClient) => {
    await c.query(
      `INSERT INTO audit_log (id, entity_type, entity_id, action, changes, user_id, ip_address, user_agent)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7)`,
      [
        entry.entity_type,
        entry.entity_id,
        entry.action,
        JSON.stringify(entry.changes),
        entry.user_id,
        entry.ip_address ?? null,
        entry.user_agent ?? null,
      ]
    );
  };
  if (client) {
    await run(client);
    return;
  }
  const pool = getPool();
  const c = await pool.connect();
  try {
    await run(c);
  } finally {
    c.release();
  }
}
