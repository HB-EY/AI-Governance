/**
 * Evidence export job (WO-45): query traces, build JSON/CSV, upload to S3, set result_key on job.
 */
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getPool } from './db/pool.js';
const TRACE_COLS = 'id, run_id, agent_id, agent_version_id, action_type, target_resource, status, context, reasoning, proposal_id, request_payload, request_timestamp, completed_at, created_at';
function getS3Client() {
    const bucket = process.env.S3_BUCKET ?? process.env.AWS_S3_BUCKET;
    if (!bucket)
        return null;
    const region = process.env.S3_REGION ?? process.env.AWS_REGION ?? 'us-east-1';
    const endpoint = process.env.S3_ENDPOINT ?? process.env.AWS_S3_ENDPOINT;
    const accessKeyId = process.env.S3_ACCESS_KEY_ID ?? process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY ?? process.env.AWS_SECRET_ACCESS_KEY;
    return new S3Client({
        region,
        ...(endpoint && { endpoint, forcePathStyle: true }),
        ...(accessKeyId && secretAccessKey && { credentials: { accessKeyId, secretAccessKey } }),
    });
}
function buildWhere(filters, params, startIdx) {
    const parts = [];
    let idx = startIdx;
    if (filters.agent_id) {
        parts.push(` AND agent_id = $${++idx}`);
        params.push(filters.agent_id);
    }
    if (filters.action_type) {
        parts.push(` AND action_type = $${++idx}`);
        params.push(filters.action_type);
    }
    if (filters.status) {
        parts.push(` AND status = $${++idx}`);
        params.push(filters.status);
    }
    if (filters.start_time) {
        parts.push(` AND request_timestamp >= $${++idx}`);
        params.push(filters.start_time);
    }
    if (filters.end_time) {
        parts.push(` AND request_timestamp <= $${++idx}`);
        params.push(filters.end_time);
    }
    return { sql: parts.join(''), nextIdx: idx };
}
export async function runEvidenceExport(job) {
    const payload = job.payload;
    const filters = payload?.filters ?? {};
    const format = (payload?.format === 'csv' ? 'csv' : 'json');
    const includeFull = Boolean(payload?.include_full_payloads);
    const pool = getPool();
    if (!pool)
        throw new Error('No database pool');
    const params = [];
    const { sql: whereSql, nextIdx } = buildWhere(filters, params, 0);
    const query = `SELECT ${TRACE_COLS} FROM traces WHERE 1=1 ${whereSql} ORDER BY request_timestamp DESC`;
    const res = await pool.query(query, params);
    const rows = res.rows;
    let exportContent;
    const bucket = process.env.S3_BUCKET ?? process.env.AWS_S3_BUCKET;
    if (format === 'csv') {
        const headers = ['id', 'agent_id', 'action_type', 'target_resource', 'status', 'request_timestamp', 'completed_at'];
        const lines = [headers.join(',')];
        for (const r of rows) {
            const cells = headers.map((h) => {
                const v = r[h];
                if (v == null)
                    return '';
                const s = String(v);
                return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
            });
            lines.push(cells.join(','));
        }
        exportContent = lines.join('\n');
    }
    else {
        const out = rows.map((r) => {
            const obj = { ...r };
            if (obj.request_payload && typeof obj.request_payload === 'object') {
                // already parsed
            }
            else if (obj.request_payload && typeof obj.request_payload === 'string') {
                try {
                    obj.request_payload = JSON.parse(obj.request_payload);
                }
                catch {
                    // leave as string
                }
            }
            return obj;
        });
        exportContent = JSON.stringify(out, null, 0);
    }
    const resultKey = `exports/${job.id}.${format}`;
    const s3 = getS3Client();
    if (!s3 || !bucket) {
        throw new Error('S3 not configured; set S3_BUCKET and credentials for export');
    }
    await s3.send(new PutObjectCommand({
        Bucket: bucket,
        Key: resultKey,
        Body: exportContent,
        ContentType: format === 'csv' ? 'text/csv' : 'application/json',
    }));
    await pool.query(`UPDATE jobs SET payload = payload || $1::jsonb WHERE id = $2`, [JSON.stringify({ result_key: resultKey }), job.id]);
}
