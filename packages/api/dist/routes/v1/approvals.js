/**
 * Approval APIs (WO-34, 35, 36): create, approve, deny, get, list.
 */
import { createProposal } from '../../db/proposals.js';
import { createApprovalRequest, getApprovalById, listApprovals, setApprovalDecision, } from '../../db/approvals.js';
import { getAgentById } from '../../db/agents.js';
import { getTraceById, updateTraceStatus } from '../../db/traces.js';
import { writeAuditLog } from '../../services/audit.js';
import { notifyApprovalCreated, notifyApprovalDecided } from '../../services/approval-notify.js';
import { evidenceKey, downloadEvidence, uploadEvidence } from '../../storage/index.js';
export async function approvalRoutes(app) {
    /** When user auth is not configured, allow unauthenticated access for local dev (same as dashboard/policies). */
    const userAuth = () => (process.env.USER_JWT_SECRET ?? process.env.JWT_SECRET) ? [app.requireUserAuth()] : [];
    app.post('/', async (request, reply) => {
        const body = request.body ?? {};
        if (!body.trace_id || !body.agent_id || !body.action_type || !body.action_summary || !Array.isArray(body.approver_roles)) {
            return reply.status(400).send({
                request_id: request.id,
                timestamp: new Date().toISOString(),
                version: 'v1',
                error: { code: 'invalid_request', message: 'trace_id, agent_id, action_type, action_summary, approver_roles required' },
            });
        }
        const trace = await getTraceById(body.trace_id);
        if (!trace) {
            return reply.status(404).send({
                request_id: request.id,
                timestamp: new Date().toISOString(),
                version: 'v1',
                error: { code: 'not_found', message: 'Trace not found' },
            });
        }
        const expiresIn = Math.min(86400, Math.max(60, body.expires_in_seconds ?? 3600));
        const expiresAt = new Date(Date.now() + expiresIn * 1000);
        const proposalId = crypto.randomUUID();
        const approvalId = crypto.randomUUID();
        const proposalContent = { action_type: body.action_type, action_summary: body.action_summary };
        const proposalHash = Buffer.from(JSON.stringify(proposalContent)).toString('base64').slice(0, 64);
        await createProposal({
            id: proposalId,
            trace_id: body.trace_id,
            agent_id: body.agent_id,
            proposal_hash: proposalHash,
            proposal_content: proposalContent,
        });
        await createApprovalRequest({
            id: approvalId,
            trace_id: body.trace_id,
            proposal_id: proposalId,
            agent_id: body.agent_id,
            action_type: body.action_type,
            action_summary: body.action_summary,
            approver_roles: body.approver_roles,
            assigned_approvers: body.assigned_approvers ?? null,
            expires_at: expiresAt,
        });
        const agent = await getAgentById(body.agent_id);
        await notifyApprovalCreated({
            approval_id: approvalId,
            agent_id: body.agent_id,
            agent_name: agent?.name,
            action_type: body.action_type,
            action_summary: body.action_summary,
            assigned_approvers: body.assigned_approvers ?? body.approver_roles,
            expires_at: expiresAt.toISOString(),
            detail_url: `/approvals/${approvalId}`,
        });
        const approval = await getApprovalById(approvalId);
        return reply.status(201).send({
            request_id: request.id,
            timestamp: new Date().toISOString(),
            data: approval,
        });
    });
    app.get('/:approval_id', async (request, reply) => {
        const { approval_id } = request.params;
        const approval = await getApprovalById(approval_id);
        if (!approval) {
            return reply.status(404).send({
                request_id: request.id,
                timestamp: new Date().toISOString(),
                version: 'v1',
                error: { code: 'not_found', message: 'Approval not found' },
            });
        }
        const agent = await getAgentById(approval.agent_id);
        const trace = await getTraceById(approval.trace_id);
        let evidence_summary = {};
        try {
            const key = evidenceKey(approval.trace_id);
            const raw = await downloadEvidence(key);
            if (raw)
                evidence_summary = JSON.parse(raw);
        }
        catch {
            // ignore
        }
        const expiresAt = new Date(approval.expires_at);
        const time_remaining_seconds = approval.status === 'pending' ? Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000)) : 0;
        return reply.send({
            request_id: request.id,
            timestamp: new Date().toISOString(),
            data: {
                ...approval,
                agent_name: agent?.name,
                evidence_summary,
                time_remaining_seconds,
            },
        });
    });
    app.get('/', async (request, reply) => {
        const q = request.query;
        const page = Math.max(1, parseInt(q.page ?? '1', 10));
        const pageSize = Math.min(50, Math.max(1, parseInt(q.page_size ?? '20', 10)));
        const { items, total } = await listApprovals({ status: q.status ?? 'pending', approver_id: q.approver_id, approver_role: q.approver_role }, { page, pageSize });
        return reply.send({
            request_id: request.id,
            timestamp: new Date().toISOString(),
            data: { items, pagination: { page, page_size: pageSize, total } },
        });
    });
    app.post('/:approval_id/approve', {
        preHandler: userAuth(),
    }, async (request, reply) => {
        const { approval_id } = request.params;
        const body = request.body ?? {};
        const approval = await getApprovalById(approval_id);
        if (!approval) {
            return reply.status(404).send({
                request_id: request.id,
                timestamp: new Date().toISOString(),
                version: 'v1',
                error: { code: 'not_found', message: 'Approval not found' },
            });
        }
        if (approval.status !== 'pending') {
            return reply.status(409).send({
                request_id: request.id,
                timestamp: new Date().toISOString(),
                version: 'v1',
                error: { code: 'conflict', message: 'Approval already decided or expired' },
            });
        }
        const userId = request.user?.sub ?? request.headers['x-user-id'] ?? 'system';
        const updated = await setApprovalDecision(approval_id, 'approved', { approver_id: userId, decision_reason: body.reason ?? null });
        await updateTraceStatus(approval.trace_id, 'success');
        try {
            const key = evidenceKey(approval.trace_id);
            const raw = await downloadEvidence(key);
            const payload = raw ? JSON.parse(raw) : { events: [] };
            if (!Array.isArray(payload.events))
                payload.events = [];
            payload.events.push({ event_type: 'approval_decision', decision: 'approved', approval_id, approver_id: userId, reason: body.reason, timestamp: new Date().toISOString() });
            await uploadEvidence(approval.trace_id, payload);
        }
        catch {
            // ignore
        }
        await writeAuditLog({
            entity_type: 'approval',
            entity_id: approval_id,
            action: 'update',
            changes: { decision: 'approved', approver_id: userId, reason: body.reason },
            user_id: userId,
            ip_address: request.ip,
            user_agent: request.headers['user-agent'] ?? null,
        });
        await notifyApprovalDecided({ approval_id, decision: 'approved', approver_id: userId, reason: body.reason });
        return reply.send({
            request_id: request.id,
            timestamp: new Date().toISOString(),
            data: updated,
        });
    });
    app.post('/:approval_id/deny', {
        preHandler: userAuth(),
    }, async (request, reply) => {
        const { approval_id } = request.params;
        const body = request.body ?? {};
        if (!body.reason || !String(body.reason).trim()) {
            return reply.status(400).send({
                request_id: request.id,
                timestamp: new Date().toISOString(),
                version: 'v1',
                error: { code: 'invalid_request', message: 'reason is required for deny' },
            });
        }
        const approval = await getApprovalById(approval_id);
        if (!approval) {
            return reply.status(404).send({
                request_id: request.id,
                timestamp: new Date().toISOString(),
                version: 'v1',
                error: { code: 'not_found', message: 'Approval not found' },
            });
        }
        if (approval.status !== 'pending') {
            return reply.status(409).send({
                request_id: request.id,
                timestamp: new Date().toISOString(),
                version: 'v1',
                error: { code: 'conflict', message: 'Approval already decided or expired' },
            });
        }
        const userId = request.user?.sub ?? request.headers['x-user-id'] ?? 'system';
        const updated = await setApprovalDecision(approval_id, 'denied', { approver_id: userId, decision_reason: body.reason });
        await updateTraceStatus(approval.trace_id, 'denied');
        try {
            const key = evidenceKey(approval.trace_id);
            const raw = await downloadEvidence(key);
            const payload = raw ? JSON.parse(raw) : { events: [] };
            if (!Array.isArray(payload.events))
                payload.events = [];
            payload.events.push({ event_type: 'approval_decision', decision: 'denied', approval_id, approver_id: userId, reason: body.reason, timestamp: new Date().toISOString() });
            await uploadEvidence(approval.trace_id, payload);
        }
        catch {
            // ignore
        }
        await writeAuditLog({
            entity_type: 'approval',
            entity_id: approval_id,
            action: 'update',
            changes: { decision: 'denied', approver_id: userId, reason: body.reason },
            user_id: userId,
            ip_address: request.ip,
            user_agent: request.headers['user-agent'] ?? null,
        });
        await notifyApprovalDecided({ approval_id, decision: 'denied', approver_id: userId, reason: body.reason });
        return reply.send({
            request_id: request.id,
            timestamp: new Date().toISOString(),
            data: updated,
        });
    });
}
