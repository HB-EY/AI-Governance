/**
 * Audit log: write entries to audit_log for agent, policy, validation_check, approval.
 */
import type { PoolClient } from 'pg';
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
export declare function writeAuditLog(entry: AuditEntry, client?: PoolClient): Promise<void>;
