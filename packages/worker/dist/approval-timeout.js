/**
 * Approval timeout job (WO-37): find expired pending approvals, set status to expired, update trace.
 */
import { getPool } from './db/pool.js';
export async function runApprovalTimeout() {
    const pool = getPool();
    if (!pool)
        return 0;
    const res = await pool.query(`SELECT id, trace_id, agent_id FROM approval_requests WHERE status = 'pending' AND expires_at < NOW()`);
    const rows = res.rows;
    let count = 0;
    for (const row of rows) {
        await pool.query(`UPDATE approval_requests SET status = 'expired', updated_at = NOW() WHERE id = $1`, [row.id]);
        await pool.query(`UPDATE traces SET status = 'denied', completed_at = NOW() WHERE id = $1`, [row.trace_id]);
        const webhook = process.env.APPROVAL_NOTIFY_WEBHOOK_URL;
        if (webhook) {
            try {
                await fetch(webhook, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ event: 'approval_expired', approval_id: row.id, agent_id: row.agent_id }),
                    signal: AbortSignal.timeout(5000),
                });
            }
            catch {
                // ignore
            }
        }
        count++;
        console.info('[worker] approval expired', row.id);
    }
    return count;
}
