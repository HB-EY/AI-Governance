/**
 * Gateway action submission (WO-39, 40): receive action, validate agent, evaluate policy, handle decisions.
 */

import type { FastifyInstance } from 'fastify';
import { getPool } from '../../db/pool.js';
import { getAgentById } from '../../db/agents.js';
import { createTrace, getTraceById, updateTraceStatus } from '../../db/traces.js';
import { listActivePolicyVersions } from '../../db/policies.js';
import { evaluatePolicies, type EvaluationContext } from '../../services/policy-evaluator.js';
import { runValidation } from '../../services/validation-runner.js';
import { listValidationChecks } from '../../db/validation-checks.js';
import { createProposal } from '../../db/proposals.js';
import { createApprovalRequest, getApprovalById } from '../../db/approvals.js';
import { evidenceKey, uploadEvidence, downloadEvidence } from '../../storage/index.js';
import { notifyApprovalCreated } from '../../services/approval-notify.js';
import { proxyToDownstream } from '../../services/downstream-proxy.js';
import { checkAgentRateLimit, checkActionRateLimit } from '../../services/rate-limit.js';
import { gatewayRequestKey } from '../../cache/keys.js';
import { cacheSet, cacheGet } from '../../cache/store.js';

const REQUEST_MAP_TTL = 86400; // 24h
const REGISTRY_TIMEOUT_MS = 2000;
const POLICY_TIMEOUT_MS = 5000;

interface GatewayActionBody {
  action_type: string;
  target_resource: string;
  parameters?: Record<string, unknown>;
  context?: Record<string, unknown>;
  reasoning?: string;
  output?: unknown;
}

function parseBody(body: unknown): GatewayActionBody | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  if (typeof b.action_type !== 'string' || typeof b.target_resource !== 'string') return null;
  return {
    action_type: b.action_type,
    target_resource: b.target_resource,
    parameters: b.parameters as Record<string, unknown> | undefined,
    context: b.context as Record<string, unknown> | undefined,
    reasoning: typeof b.reasoning === 'string' ? b.reasoning : undefined,
    output: b.output,
  };
}

export async function gatewayRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: unknown }>('/actions', {
    preHandler: [app.requireAgentAuth()],
  }, async (request, reply) => {
    const requestId = request.id ?? crypto.randomUUID();
    const agentId = (request as { agentId?: string }).agentId;
    if (!agentId) {
      return reply.status(401).send({
        request_id: requestId,
        timestamp: new Date().toISOString(),
        version: 'v1',
        error: { code: 'unauthorized', message: 'Agent authentication required' },
      });
    }

    const body = parseBody(request.body);
    if (!body) {
      return reply.status(400).send({
        request_id: requestId,
        timestamp: new Date().toISOString(),
        version: 'v1',
        error: { code: 'invalid_request', message: 'action_type and target_resource required' },
      });
    }

    const [agentLimit, actionLimit] = await Promise.all([
      checkAgentRateLimit(agentId),
      checkActionRateLimit(agentId, body.action_type),
    ]);
    if (!agentLimit.allowed) {
      reply.header('X-RateLimit-Limit', String(agentLimit.limit));
      reply.header('X-RateLimit-Remaining', '0');
      reply.header('X-RateLimit-Reset', String(agentLimit.resetAt));
      if (agentLimit.retryAfterSec) reply.header('Retry-After', String(agentLimit.retryAfterSec));
      return reply.status(429).send({
        request_id: requestId,
        timestamp: new Date().toISOString(),
        version: 'v1',
        error: { code: 'rate_limit_exceeded', message: 'Too many requests per minute' },
      });
    }
    if (!actionLimit.allowed) {
      reply.header('X-RateLimit-Limit', String(actionLimit.limit));
      reply.header('X-RateLimit-Remaining', '0');
      reply.header('X-RateLimit-Reset', String(actionLimit.resetAt));
      if (actionLimit.retryAfterSec) reply.header('Retry-After', String(actionLimit.retryAfterSec));
      return reply.status(429).send({
        request_id: requestId,
        timestamp: new Date().toISOString(),
        version: 'v1',
        error: { code: 'rate_limit_exceeded', message: 'Too many requests for this action type' },
      });
    }

    const agent = await getAgentById(agentId);
    if (!agent) {
      return reply.status(403).send({
        request_id: requestId,
        timestamp: new Date().toISOString(),
        version: 'v1',
        error: { code: 'forbidden', message: 'Agent not registered' },
      });
    }
    if (agent.status !== 'active') {
      return reply.status(403).send({
        request_id: requestId,
        timestamp: new Date().toISOString(),
        version: 'v1',
        error: { code: 'forbidden', message: 'Agent is not active' },
      });
    }

    const agentVersionId = agent.current_version_id;
    if (!agentVersionId) {
      return reply.status(403).send({
        request_id: requestId,
        timestamp: new Date().toISOString(),
        version: 'v1',
        error: { code: 'forbidden', message: 'Agent has no active version' },
      });
    }

    const traceId = crypto.randomUUID();
    const requestTimestamp = new Date().toISOString();
    await createTrace({
      id: traceId,
      agent_id: agentId,
      agent_version_id: agentVersionId,
      action_type: body.action_type,
      target_resource: body.target_resource,
      context: body.context,
      reasoning: body.reasoning ?? null,
      request_payload: body.parameters,
    });
    const initialPayload = {
      trace_id: traceId,
      agent_id: agentId,
      action_type: body.action_type,
      target_resource: body.target_resource,
      parameters: body.parameters ?? {},
      context: body.context ?? {},
      reasoning: body.reasoning ?? null,
      request_timestamp: requestTimestamp,
      events: [],
    };
    await uploadEvidence(traceId, initialPayload);
    await cacheSet(gatewayRequestKey(requestId), { trace_id: traceId }, REQUEST_MAP_TTL);

    let agentCapabilities: string[] = [];
    try {
      const pool = getPool();
      const capRes = await pool.query('SELECT capabilities FROM agent_versions WHERE id = $1', [agentVersionId]);
      if (capRes.rows[0]) agentCapabilities = (capRes.rows[0] as { capabilities: string[] }).capabilities ?? [];
    } catch {
      // ignore
    }
    const policies = await listActivePolicyVersions();
    const policyList = policies.map((v) => ({ policy_id: v.policy_id, version: v }));
    const now = new Date();
    const ctx: EvaluationContext = {
      agent_capabilities: agentCapabilities,
      action_type: body.action_type,
      resource_pattern: body.target_resource,
      time_hour: now.getUTCHours(),
      time_day_of_week: now.getUTCDay(),
    };
    const policyResult = evaluatePolicies(policyList, ctx);

    const appendEvent = async (event: unknown): Promise<void> => {
      try {
        const key = evidenceKey(traceId);
        const raw = await downloadEvidence(key);
        const payload = raw ? (JSON.parse(raw) as { events?: unknown[] }) : { events: [] };
        if (!Array.isArray(payload.events)) payload.events = [];
        payload.events.push(event);
        await uploadEvidence(traceId, payload);
      } catch {
        // ignore
      }
    };

    if (policyResult.decision === 'deny') {
      await appendEvent({
        event_type: 'policy_decision',
        decision: 'deny',
        denial_reason: policyResult.denial_reason,
        matched_policy_ids: policyResult.matched_policy_ids,
        timestamp: new Date().toISOString(),
      });
      await updateTraceStatus(traceId, 'denied');
      return reply.status(403).send({
        request_id: requestId,
        timestamp: new Date().toISOString(),
        version: 'v1',
        error: {
          code: 'policy_denied',
          message: policyResult.denial_reason ?? 'Action denied by policy',
          details: { matched_policy_ids: policyResult.matched_policy_ids },
        },
        data: { trace_id: traceId },
      });
    }

    if (policyResult.decision === 'allow-with-validation' && policyResult.validation_types?.length) {
      const checks = (await listValidationChecks({ status: 'active' })).filter((c) =>
        policyResult.validation_types!.includes(c.check_type)
      );
      const runResult = await runValidation(checks, {
        action: { action_type: body.action_type, target_resource: body.target_resource, ...body.parameters },
        output: body.output,
        text: typeof body.output === 'string' ? body.output : undefined,
      });
      await appendEvent({
        event_type: 'validation_result',
        result: runResult.result,
        checks_run: runResult.checks_run,
        timestamp: new Date().toISOString(),
      });
      if (runResult.result === 'fail') {
        await updateTraceStatus(traceId, 'denied');
        return reply.status(403).send({
          request_id: requestId,
          timestamp: new Date().toISOString(),
          version: 'v1',
          error: {
            code: 'validation_failed',
            message: 'Validation checks failed',
            details: { checks_run: runResult.checks_run },
          },
          data: { trace_id: traceId },
        });
      }
      return reply.send({
        request_id: requestId,
        timestamp: new Date().toISOString(),
        data: {
          trace_id: traceId,
          decision: 'allow-with-validation',
          validation_result: runResult.result,
          checks_run: runResult.checks_run,
        },
      });
    }

    if (policyResult.decision === 'allow-with-approval' && policyResult.approver_roles?.length) {
      const expiresIn = 3600;
      const expiresAt = new Date(Date.now() + expiresIn * 1000);
      const proposalId = crypto.randomUUID();
      const approvalId = crypto.randomUUID();
      const proposalContent = { action_type: body.action_type, action_summary: body.target_resource };
      const proposalHash = Buffer.from(JSON.stringify(proposalContent)).toString('base64').slice(0, 64);
      await createProposal({
        id: proposalId,
        trace_id: traceId,
        agent_id: agentId,
        proposal_hash: proposalHash,
        proposal_content: proposalContent,
      });
      await createApprovalRequest({
        id: approvalId,
        trace_id: traceId,
        proposal_id: proposalId,
        agent_id: agentId,
        action_type: body.action_type,
        action_summary: body.target_resource,
        approver_roles: policyResult.approver_roles,
        assigned_approvers: null,
        expires_at: expiresAt,
      });
      await appendEvent({
        event_type: 'approval_required',
        approval_id: approvalId,
        approver_roles: policyResult.approver_roles,
        expires_at: expiresAt.toISOString(),
        timestamp: new Date().toISOString(),
      });
      await notifyApprovalCreated({
        approval_id: approvalId,
        agent_id: agentId,
        agent_name: agent.name,
        action_type: body.action_type,
        action_summary: body.target_resource,
        assigned_approvers: policyResult.approver_roles,
        expires_at: expiresAt.toISOString(),
        detail_url: `/approvals/${approvalId}`,
      });
      const approval = await getApprovalById(approvalId);
      await cacheSet(gatewayRequestKey(requestId), { trace_id: traceId, approval_id: approvalId }, REQUEST_MAP_TTL);
      const baseUrl = process.env.GATEWAY_BASE_URL ?? (request.headers['x-forwarded-proto'] && request.headers['x-forwarded-host'] ? `${request.headers['x-forwarded-proto']}://${request.headers['x-forwarded-host']}` : '');
      const pollUrl = baseUrl ? `${baseUrl}/v1/gateway/actions/${requestId}/status` : `/v1/gateway/actions/${requestId}/status`;
      reply.header('X-RateLimit-Limit', String(actionLimit.limit));
      reply.header('X-RateLimit-Remaining', String(Math.min(agentLimit.remaining, actionLimit.remaining)));
      reply.header('X-RateLimit-Reset', String(Math.max(agentLimit.resetAt, actionLimit.resetAt)));
      return reply.status(202).send({
        request_id: requestId,
        timestamp: new Date().toISOString(),
        data: {
          trace_id: traceId,
          decision: 'allow-with-approval',
          approval_id: approvalId,
          approver_roles: policyResult.approver_roles,
          expires_at: approval?.expires_at,
          status: 'pending_approval',
          poll_url: pollUrl,
        },
      });
    }

    const downstream = await proxyToDownstream(
      body.action_type,
      body.target_resource,
      body.parameters ?? {},
      body.context
    );
    await appendEvent({
      event_type: 'outcome',
      success: downstream.success,
      status_code: downstream.status_code,
      body: downstream.body,
      error: downstream.error,
      timestamp: new Date().toISOString(),
    });
    await updateTraceStatus(traceId, downstream.success ? 'success' : 'failed');
    if (!downstream.success) {
      return reply.status(502).send({
        request_id: requestId,
        timestamp: new Date().toISOString(),
        version: 'v1',
        error: {
          code: 'downstream_error',
          message: downstream.error ?? 'Action execution failed',
          details: downstream.body,
        },
        data: { trace_id: traceId },
      });
    }
    reply.header('X-RateLimit-Limit', String(actionLimit.limit));
    reply.header('X-RateLimit-Remaining', String(Math.min(agentLimit.remaining, actionLimit.remaining)));
    reply.header('X-RateLimit-Reset', String(Math.max(agentLimit.resetAt, actionLimit.resetAt)));
    return reply.send({
      request_id: requestId,
      timestamp: new Date().toISOString(),
      data: {
        trace_id: traceId,
        decision: 'allow',
        outcome: downstream.body,
      },
    });
  });

  app.get<{ Params: { request_id: string } }>('/actions/:request_id/status', {
    preHandler: [app.requireAgentAuth()],
  }, async (request, reply) => {
    const agentId = (request as { agentId?: string }).agentId;
    const { request_id } = request.params as { request_id: string };
    if (!agentId) {
      return reply.status(401).send({
        request_id: request_id,
        timestamp: new Date().toISOString(),
        version: 'v1',
        error: { code: 'unauthorized', message: 'Agent authentication required' },
      });
    }
    const cached = await cacheGet<{ trace_id: string; approval_id?: string }>(gatewayRequestKey(request_id));
    if (!cached?.trace_id) {
      return reply.status(404).send({
        request_id: request_id,
        timestamp: new Date().toISOString(),
        version: 'v1',
        error: { code: 'not_found', message: 'Request not found or expired' },
      });
    }
    const trace = await getTraceById(cached.trace_id);
    if (!trace || trace.agent_id !== agentId) {
      return reply.status(404).send({
        request_id: request_id,
        timestamp: new Date().toISOString(),
        version: 'v1',
        error: { code: 'not_found', message: 'Request not found or expired' },
      });
    }
    let status: string = trace.status;
    let decision: string | undefined;
    let approval_id: string | undefined = cached.approval_id;
    let denial_reason: string | undefined;
    if (cached.approval_id) {
      const approval = await getApprovalById(cached.approval_id);
      if (approval) {
        if (approval.status === 'approved') {
          status = 'approved';
          decision = 'allow';
        } else if (approval.status === 'denied') {
          status = 'denied';
          denial_reason = approval.decision_reason ?? 'Approval denied';
        } else if (approval.status === 'expired') {
          status = 'expired';
          denial_reason = 'Approval request expired';
        } else {
          status = 'pending_approval';
        }
      }
    }
    return reply.send({
      request_id: request_id,
      timestamp: new Date().toISOString(),
      data: {
        trace_id: cached.trace_id,
        approval_id,
        status,
        decision,
        denial_reason,
      },
    });
  });
}
