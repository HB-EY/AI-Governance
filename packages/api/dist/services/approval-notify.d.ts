/**
 * Approval notifications (WO-34, 35, 37): stub that logs and optionally calls webhook.
 */
export declare function notifyApprovalCreated(params: {
    approval_id: string;
    agent_id: string;
    agent_name?: string;
    action_type: string;
    action_summary: string;
    assigned_approvers: string[];
    expires_at: string;
    detail_url?: string;
}): Promise<void>;
export declare function notifyApprovalDecided(params: {
    approval_id: string;
    decision: 'approved' | 'denied';
    approver_id?: string;
    reason?: string;
}): Promise<void>;
export declare function notifyApprovalExpired(params: {
    approval_id: string;
    agent_id: string;
}): Promise<void>;
