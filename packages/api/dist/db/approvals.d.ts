/**
 * Approval requests (WO-34, 35, 36, 37).
 */
import type { PoolClient } from 'pg';
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
export declare function createApprovalRequest(data: {
    id: string;
    trace_id: string;
    proposal_id: string;
    agent_id: string;
    action_type: string;
    action_summary: string;
    approver_roles: string[];
    assigned_approvers?: string[] | null;
    expires_at: Date;
}, client?: PoolClient): Promise<ApprovalRequestRow>;
export declare function getApprovalById(id: string, client?: PoolClient): Promise<ApprovalRequestRow | null>;
export declare function listApprovals(filters: {
    status?: string;
    approver_id?: string;
    approver_role?: string;
}, pagination: {
    page: number;
    pageSize: number;
}, client?: PoolClient): Promise<{
    items: ApprovalRequestRow[];
    total: number;
}>;
export declare function setApprovalDecision(id: string, decision: 'approved' | 'denied' | 'expired', data: {
    approver_id?: string | null;
    decision_reason?: string | null;
}, client?: PoolClient): Promise<ApprovalRequestRow | null>;
export declare function getExpiredPendingApprovals(client?: PoolClient): Promise<ApprovalRequestRow[]>;
