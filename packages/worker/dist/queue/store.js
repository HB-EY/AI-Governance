/**
 * Job queue: enqueue, poll with row-level locking, update status.
 */
const LOCK_TIMEOUT_MS = 60_000;
const WORKER_ID = process.env.WORKER_ID ?? `worker-${process.pid}`;
export async function enqueue(pool, name, payload, options) {
    const queue = options?.queue ?? 'default';
    const scheduled_at = options?.scheduled_at ?? new Date();
    const res = await pool.query(`INSERT INTO jobs (queue, name, payload, scheduled_at, status)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`, [queue, name, JSON.stringify(payload), scheduled_at, scheduled_at > new Date() ? 'scheduled' : 'pending']);
    return res.rows[0].id;
}
export async function pollNext(pool, queue = 'default') {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const res = await client.query(`SELECT id, queue, name, payload, attempts, max_attempts, status,
              scheduled_at, started_at, completed_at, locked_at, locked_by,
              error_message, created_at, updated_at
       FROM jobs
       WHERE queue = $1 AND status IN ('pending', 'scheduled') AND scheduled_at <= NOW()
       ORDER BY scheduled_at ASC
       LIMIT 1
       FOR UPDATE SKIP LOCKED`, [queue]);
        if (res.rows.length === 0) {
            await client.query('COMMIT');
            return null;
        }
        const row = res.rows[0];
        await client.query(`UPDATE jobs SET status = 'running', started_at = NOW(), locked_at = NOW(), locked_by = $1, updated_at = NOW() WHERE id = $2`, [WORKER_ID, row.id]);
        await client.query('COMMIT');
        return mapRow(row);
    }
    catch (e) {
        await client.query('ROLLBACK').catch(() => { });
        throw e;
    }
    finally {
        client.release();
    }
}
export async function complete(pool, jobId) {
    await pool.query(`UPDATE jobs SET status = 'completed', completed_at = NOW(), locked_at = NULL, locked_by = NULL, updated_at = NOW() WHERE id = $1`, [jobId]);
}
export async function fail(pool, jobId, errorMessage) {
    await pool.query(`UPDATE jobs SET attempts = attempts + 1, error_message = $1, updated_at = NOW() WHERE id = $2`, [errorMessage, jobId]);
    const res = await pool.query(`SELECT attempts, max_attempts FROM jobs WHERE id = $1`, [jobId]);
    const row = res.rows[0];
    if (row && row.attempts >= row.max_attempts) {
        await pool.query(`UPDATE jobs SET status = 'failed', completed_at = NOW(), locked_at = NULL, locked_by = NULL, updated_at = NOW() WHERE id = $1`, [jobId]);
    }
    else {
        await pool.query(`UPDATE jobs SET status = 'pending', locked_at = NULL, locked_by = NULL, updated_at = NOW() WHERE id = $1`, [jobId]);
    }
}
function mapRow(row) {
    let payload = {};
    if (typeof row.payload === 'object' && row.payload !== null) {
        payload = row.payload;
    }
    else if (typeof row.payload === 'string') {
        try {
            payload = JSON.parse(row.payload);
        }
        catch {
            payload = {};
        }
    }
    return {
        id: row.id,
        queue: row.queue,
        name: row.name,
        payload,
        attempts: Number(row.attempts),
        max_attempts: Number(row.max_attempts),
        status: row.status,
        scheduled_at: new Date(row.scheduled_at),
        started_at: row.started_at ? new Date(row.started_at) : null,
        completed_at: row.completed_at ? new Date(row.completed_at) : null,
        locked_at: row.locked_at ? new Date(row.locked_at) : null,
        locked_by: row.locked_by,
        error_message: row.error_message,
        created_at: new Date(row.created_at),
        updated_at: new Date(row.updated_at),
    };
}
