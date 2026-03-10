/**
 * Proposals: create for approval workflow (WO-34).
 */
import type { PoolClient } from 'pg';
export declare function createProposal(data: {
    id: string;
    trace_id: string;
    agent_id: string;
    proposal_hash: string;
    proposal_content: Record<string, unknown>;
}, client?: PoolClient): Promise<void>;
