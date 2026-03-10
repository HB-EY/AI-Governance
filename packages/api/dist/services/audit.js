/**
 * Audit log: write entries to audit_log for agent, policy, validation_check, approval.
 */
import { getPool } from '../db/pool.js';
export async function writeAuditLog(entry, client) {
    const run = async (c) => {
        await c.query(`INSERT INTO audit_log (id, entity_type, entity_id, action, changes, user_id, ip_address, user_agent)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7)`, [
            entry.entity_type,
            entry.entity_id,
            entry.action,
            JSON.stringify(entry.changes),
            entry.user_id,
            entry.ip_address ?? null,
            entry.user_agent ?? null,
        ]);
    };
    if (client) {
        await run(client);
        return;
    }
    const pool = getPool();
    const c = await pool.connect();
    try {
        await run(c);
    }
    finally {
        c.release();
    }
}
