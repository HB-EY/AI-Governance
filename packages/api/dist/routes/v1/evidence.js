/**
 * Evidence and trace APIs (WO-25, WO-26, WO-27). Evidence export (WO-45).
 */
import { getPool } from '../../db/pool.js';
import { getAgentById } from '../../db/agents.js';
import { createTrace, getTraceById, listTraces, updateTraceStatus } from '../../db/traces.js';
import { evidenceKey, uploadEvidence, downloadEvidence, getPresignedDownloadUrl } from '../../storage/index.js';
import { writeAuditLog } from '../../services/audit.js';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@ai-governance/shared';
export async function evidenceRoutes(app) {
    app.post('/traces', async (request, reply) => {
        const body = request.body ?? {};
        if (!body.agent_id || !body.action_type || !body.target_resource) {
            return reply.status(400).send({
                request_id: request.id,
                timestamp: new Date().toISOString(),
                version: 'v1',
                error: { code: 'invalid_request', message: 'agent_id, action_type, target_resource required' },
            });
        }
        const agent = await getAgentById(body.agent_id);
        if (!agent) {
            return reply.status(404).send({
                request_id: request.id,
                timestamp: new Date().toISOString(),
                version: 'v1',
                error: { code: 'not_found', message: 'Agent not found' },
            });
        }
        const agentVersionId = agent.current_version_id;
        if (!agentVersionId) {
            return reply.status(400).send({
                request_id: request.id,
                timestamp: new Date().toISOString(),
                version: 'v1',
                error: { code: 'invalid_request', message: 'Agent has no active version' },
            });
        }
        const traceId = body.trace_id ?? crypto.randomUUID();
        const requestTimestamp = new Date().toISOString();
        const payload = {
            trace_id: traceId,
            agent_id: body.agent_id,
            action_type: body.action_type,
            target_resource: body.target_resource,
            parameters: body.parameters ?? {},
            context: body.context ?? {},
            reasoning: body.reasoning ?? null,
            request_timestamp: requestTimestamp,
            events: [],
        };
        await createTrace({
            id: traceId,
            agent_id: body.agent_id,
            agent_version_id: agentVersionId,
            action_type: body.action_type,
            target_resource: body.target_resource,
            context: body.context,
            reasoning: body.reasoning ?? null,
            request_payload: body.parameters,
        });
        const key = evidenceKey(traceId);
        await uploadEvidence(traceId, payload);
        return reply.status(201).send({
            request_id: request.id,
            timestamp: new Date().toISOString(),
            data: { trace_id: traceId, evidence_key: key },
        });
    });
    app.post('/traces/:trace_id/events', async (request, reply) => {
        const { trace_id } = request.params;
        const body = request.body ?? {};
        const trace = await getTraceById(trace_id);
        if (!trace) {
            return reply.status(404).send({
                request_id: request.id,
                timestamp: new Date().toISOString(),
                version: 'v1',
                error: { code: 'not_found', message: 'Trace not found' },
            });
        }
        if (trace.status !== 'pending' && body.event_type === 'outcome') {
            return reply.status(409).send({
                request_id: request.id,
                timestamp: new Date().toISOString(),
                version: 'v1',
                error: { code: 'conflict', message: 'Trace already finalized' },
            });
        }
        const key = evidenceKey(trace_id);
        const raw = await downloadEvidence(key);
        let payload = raw ? JSON.parse(raw) : { events: [] };
        if (!Array.isArray(payload.events))
            payload.events = [];
        const event = { ...body, timestamp: new Date().toISOString() };
        payload.events.push(event);
        await uploadEvidence(trace_id, payload);
        if (body.event_type === 'outcome') {
            const status = body.status ?? 'success';
            await updateTraceStatus(trace_id, status);
        }
        return reply.send({
            request_id: request.id,
            timestamp: new Date().toISOString(),
            data: { trace_id, event },
        });
    });
    app.get('/traces', async (request, reply) => {
        const q = request.query;
        const page = Math.max(1, parseInt(q.page ?? '1', 10));
        const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(q.page_size ?? String(DEFAULT_PAGE_SIZE), 10)));
        const result = await listTraces({
            pagination: { page, pageSize },
            sort: { column: 'request_timestamp', order: 'desc' },
            filters: {
                agent_id: q.agent_id,
                status: q.status,
                action_type: q.action_type,
                from: q.from,
                to: q.to,
            },
        });
        return reply.send({
            request_id: request.id,
            timestamp: new Date().toISOString(),
            data: { items: result.items, pagination: { page: result.page, page_size: result.pageSize, total: result.total, has_more: result.hasMore } },
        });
    });
    app.get('/traces/:trace_id', async (request, reply) => {
        const { trace_id } = request.params;
        const trace = await getTraceById(trace_id);
        if (!trace) {
            return reply.status(404).send({
                request_id: request.id,
                timestamp: new Date().toISOString(),
                version: 'v1',
                error: { code: 'not_found', message: 'Trace not found' },
            });
        }
        const key = evidenceKey(trace_id);
        const raw = await downloadEvidence(key);
        const payload = raw ? JSON.parse(raw) : { events: [] };
        const events = Array.isArray(payload.events) ? payload.events : [];
        return reply.send({
            request_id: request.id,
            timestamp: new Date().toISOString(),
            data: { ...trace, evidence_key: key, events },
        });
    });
    app.post('/export', {
        preHandler: [app.requireUserAuth()],
    }, async (request, reply) => {
        const body = request.body ?? {};
        const format = body.format ?? 'json';
        if (format !== 'json' && format !== 'csv') {
            return reply.status(400).send({
                request_id: request.id,
                timestamp: new Date().toISOString(),
                version: 'v1',
                error: { code: 'invalid_request', message: 'format must be json or csv' },
            });
        }
        const userId = request.user?.sub ?? 'unknown';
        const payload = {
            filters: {
                agent_id: body.agent_id,
                action_type: body.action_type,
                status: body.status,
                start_time: body.start_time,
                end_time: body.end_time,
            },
            format,
            include_full_payloads: Boolean(body.include_full_payloads),
            requested_by: userId,
        };
        const pool = getPool();
        const res = await pool.query(`INSERT INTO jobs (queue, name, payload, status) VALUES ($1, $2, $3, $4) RETURNING id`, ['default', 'evidence_export', JSON.stringify(payload), 'pending']);
        const exportId = res.rows[0].id;
        await writeAuditLog({
            entity_type: 'trace',
            entity_id: exportId,
            action: 'export',
            changes: { format, requested_by: userId },
            user_id: userId,
            ip_address: request.ip,
            user_agent: request.headers['user-agent'] ?? null,
        });
        return reply.status(202).send({
            request_id: request.id,
            timestamp: new Date().toISOString(),
            data: { export_id: exportId, status: 'processing' },
        });
    });
    app.get('/exports/:export_id', {
        preHandler: [app.requireUserAuth()],
    }, async (request, reply) => {
        const { export_id } = request.params;
        const pool = getPool();
        const res = await pool.query(`SELECT id, status, payload, error_message FROM jobs WHERE id = $1 AND name = $2`, [export_id, 'evidence_export']);
        if (res.rows.length === 0) {
            return reply.status(404).send({
                request_id: request.id,
                timestamp: new Date().toISOString(),
                version: 'v1',
                error: { code: 'not_found', message: 'Export not found' },
            });
        }
        const row = res.rows[0];
        const statusMap = {
            pending: 'processing',
            running: 'processing',
            scheduled: 'processing',
            completed: 'completed',
            failed: 'failed',
        };
        const status = statusMap[row.status] ?? 'processing';
        const out = {
            export_id: row.id,
            status,
        };
        if (row.status === 'completed' && row.payload?.result_key) {
            const url = await getPresignedDownloadUrl(String(row.payload.result_key), 3600);
            if (url)
                out.download_url = url;
        }
        if (row.status === 'failed' && row.error_message)
            out.error_message = row.error_message;
        return reply.send({
            request_id: request.id,
            timestamp: new Date().toISOString(),
            data: out,
        });
    });
}
