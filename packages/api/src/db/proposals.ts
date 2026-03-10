/**
 * Proposals: create for approval workflow (WO-34).
 */

import type { PoolClient } from 'pg';
import { getPool } from './pool.js';

export async function createProposal(
  data: {
    id: string;
    trace_id: string;
    agent_id: string;
    proposal_hash: string;
    proposal_content: Record<string, unknown>;
  },
  client?: PoolClient
): Promise<void> {
  const db = client ?? getPool();
  await db.query(
    `INSERT INTO proposals (id, trace_id, agent_id, proposal_hash, proposal_content, status)
     VALUES ($1, $2, $3, $4, $5, 'pending')`,
    [
      data.id,
      data.trace_id,
      data.agent_id,
      data.proposal_hash,
      JSON.stringify(data.proposal_content),
    ]
  );
}
