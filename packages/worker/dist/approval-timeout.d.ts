/**
 * Approval timeout job (WO-37): find expired pending approvals, set status to expired, update trace.
 */
export declare function runApprovalTimeout(): Promise<number>;
