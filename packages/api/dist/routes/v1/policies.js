/**
 * Policy storage APIs (WO-20) and evaluate API (WO-22).
 */
import { createValidator, formatErrorsForApi, createPolicySchema, updatePolicySchema, } from '@ai-governance/shared';
import { getPolicyById, listPolicies, createPolicy, updatePolicy, setPolicyVersionStatus, findPolicyByName, listActivePolicyVersions } from '../../db/policies.js';
import { writeAuditLog } from '../../services/audit.js';
import { validateRules } from '../../services/policy-rules-validator.js';
import { evaluatePolicies } from '../../services/policy-evaluator.js';
import { policyKey, POLICIES_ACTIVE_KEY } from '../../cache/keys.js';
import { cacheDelete, cacheGet, cacheSet } from '../../cache/store.js';
import { publishInvalidation } from '../../cache/invalidate.js';
import { isUniqueViolation } from '../../db/errors.js';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@ai-governance/shared';
const validateCreate = createValidator(createPolicySchema);
const validateUpdate = createValidator(updatePolicySchema);
const ACTIVE_POLICIES_TTL = 300;
export async function policyRoutes(app) {
    app.post('/evaluate', async (request, reply) => {
        const body = request.body ?? {};
        const start = Date.now();
        let policies = (await cacheGet(POLICIES_ACTIVE_KEY)) ?? [];
        if (policies.length === 0) {
            const versions = await listActivePolicyVersions();
            policies = versions.map((v) => ({ policy_id: v.policy_id, version: v }));
            await cacheSet(POLICIES_ACTIVE_KEY, policies, ACTIVE_POLICIES_TTL);
        }
        const now = new Date();
        const ctx = {
            agent_capabilities: body.agent_capabilities ?? [],
            action_type: body.action_type ?? '',
            resource_pattern: body.target_resource ?? '',
            time_hour: now.getUTCHours(),
            time_day_of_week: now.getUTCDay(),
        };
        const result = evaluatePolicies(policies, ctx);
        const elapsed = Date.now() - start;
        if (elapsed > 200) {
            request.log.warn({ elapsed, requestId: request.id }, 'Policy evaluation exceeded 200ms');
        }
        return reply.send({
            request_id: request.id,
            timestamp: new Date().toISOString(),
            data: {
                decision: result.decision,
                matched_policy_ids: result.matched_policy_ids,
                denial_reason: result.denial_reason,
                validation_types: result.validation_types,
                approver_roles: result.approver_roles,
                evaluation_time_ms: elapsed,
            },
        });
    });
    app.post('/', {
        preHandler: [app.requireUserAuth()],
    }, async (request, reply) => {
        const result = validateCreate(request.body);
        if (!result.success) {
            return reply.status(400).send({
                request_id: request.id,
                timestamp: new Date().toISOString(),
                version: 'v1',
                error: { code: 'invalid_request', message: 'Validation failed', details: formatErrorsForApi(result.errors) },
            });
        }
        const body = result.data;
        const ruleErrors = validateRules(body.rules ?? []);
        if (ruleErrors.length > 0) {
            return reply.status(400).send({
                request_id: request.id,
                timestamp: new Date().toISOString(),
                version: 'v1',
                error: {
                    code: 'invalid_request',
                    message: 'Invalid rules',
                    details: ruleErrors.map((e) => ({ path: `rules[${e.index}]`, message: e.message })),
                },
            });
        }
        const existing = await findPolicyByName(body.name);
        if (existing) {
            return reply.status(409).send({
                request_id: request.id,
                timestamp: new Date().toISOString(),
                version: 'v1',
                error: { code: 'conflict', message: 'Policy name already exists' },
            });
        }
        const userId = request.user?.sub ?? request.headers['x-user-id'] ?? 'system';
        let policy;
        try {
            policy = await createPolicy(body, userId);
        }
        catch (err) {
            if (isUniqueViolation(err)) {
                return reply.status(409).send({
                    request_id: request.id,
                    timestamp: new Date().toISOString(),
                    version: 'v1',
                    error: { code: 'conflict', message: 'Policy name already exists' },
                });
            }
            throw err;
        }
        await writeAuditLog({
            entity_type: 'policy',
            entity_id: policy.id,
            action: 'create',
            changes: { name: body.name, effect: body.effect },
            user_id: userId,
            ip_address: request.ip,
            user_agent: request.headers['user-agent'] ?? null,
        });
        await publishInvalidation({ key: POLICIES_ACTIVE_KEY });
        await cacheDelete(policyKey(policy.id));
        return reply.status(201).send({
            request_id: request.id,
            timestamp: new Date().toISOString(),
            data: policy,
        });
    });
    app.get('/:policy_id', async (request, reply) => {
        const { policy_id } = request.params;
        const policy = await getPolicyById(policy_id);
        if (!policy) {
            return reply.status(404).send({
                request_id: request.id,
                timestamp: new Date().toISOString(),
                version: 'v1',
                error: { code: 'not_found', message: 'Policy not found' },
            });
        }
        return reply.send({
            request_id: request.id,
            timestamp: new Date().toISOString(),
            data: policy,
        });
    });
    app.get('/', async (request, reply) => {
        const q = request.query;
        const page = Math.max(1, parseInt(q.page ?? '1', 10));
        const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(q.page_size ?? String(DEFAULT_PAGE_SIZE), 10)));
        const filters = {};
        if (q.status)
            filters.status = q.status;
        if (q.name)
            filters.name = q.name;
        const result = await listPolicies({
            pagination: { page, pageSize },
            sort: { column: 'created_at', order: 'desc' },
            filters,
        });
        return reply.send({
            request_id: request.id,
            timestamp: new Date().toISOString(),
            data: {
                items: result.items,
                pagination: { page: result.page, page_size: result.pageSize, total: result.total, has_more: result.hasMore },
            },
        });
    });
    app.patch('/:policy_id', {
        preHandler: [app.requireUserAuth()],
    }, async (request, reply) => {
        const { policy_id } = request.params;
        const result = validateUpdate(request.body ?? {});
        if (!result.success) {
            return reply.status(400).send({
                request_id: request.id,
                timestamp: new Date().toISOString(),
                version: 'v1',
                error: { code: 'invalid_request', message: 'Validation failed', details: formatErrorsForApi(result.errors) },
            });
        }
        const body = result.data;
        if (body.rules) {
            const ruleErrors = validateRules(body.rules);
            if (ruleErrors.length > 0) {
                return reply.status(400).send({
                    request_id: request.id,
                    timestamp: new Date().toISOString(),
                    version: 'v1',
                    error: { code: 'invalid_request', message: 'Invalid rules', details: ruleErrors.map((e) => ({ path: `rules[${e.index}]`, message: e.message })) },
                });
            }
        }
        const existing = await getPolicyById(policy_id);
        if (!existing) {
            return reply.status(404).send({
                request_id: request.id,
                timestamp: new Date().toISOString(),
                version: 'v1',
                error: { code: 'not_found', message: 'Policy not found' },
            });
        }
        const userId = request.user?.sub ?? request.headers['x-user-id'] ?? 'system';
        const updated = await updatePolicy(policy_id, body, userId);
        if (!updated) {
            return reply.status(404).send({
                request_id: request.id,
                timestamp: new Date().toISOString(),
                version: 'v1',
                error: { code: 'not_found', message: 'Policy not found' },
            });
        }
        await writeAuditLog({
            entity_type: 'policy',
            entity_id: policy_id,
            action: 'update',
            changes: { before: existing, after: updated },
            user_id: userId,
            ip_address: request.ip,
            user_agent: request.headers['user-agent'] ?? null,
        });
        await publishInvalidation({ key: POLICIES_ACTIVE_KEY });
        await cacheDelete(policyKey(policy_id));
        return reply.send({
            request_id: request.id,
            timestamp: new Date().toISOString(),
            data: updated,
        });
    });
    app.post('/:policy_id/disable', {
        preHandler: [app.requireUserAuth()],
    }, async (request, reply) => {
        const { policy_id } = request.params;
        const body = request.body ?? {};
        const policy = await getPolicyById(policy_id);
        if (!policy) {
            return reply.status(404).send({
                request_id: request.id,
                timestamp: new Date().toISOString(),
                version: 'v1',
                error: { code: 'not_found', message: 'Policy not found' },
            });
        }
        const updated = await setPolicyVersionStatus(policy_id, 'disabled');
        if (!updated) {
            return reply.status(404).send({
                request_id: request.id,
                timestamp: new Date().toISOString(),
                version: 'v1',
                error: { code: 'not_found', message: 'Policy not found' },
            });
        }
        const userId = request.user?.sub ?? request.headers['x-user-id'] ?? 'system';
        await writeAuditLog({
            entity_type: 'policy',
            entity_id: policy_id,
            action: 'disable',
            changes: { reason: body.reason },
            user_id: userId,
            ip_address: request.ip,
            user_agent: request.headers['user-agent'] ?? null,
        });
        await publishInvalidation({ key: POLICIES_ACTIVE_KEY });
        await cacheDelete(policyKey(policy_id));
        return reply.send({
            request_id: request.id,
            timestamp: new Date().toISOString(),
            data: updated,
        });
    });
    app.post('/:policy_id/enable', {
        preHandler: [app.requireUserAuth()],
    }, async (request, reply) => {
        const { policy_id } = request.params;
        const policy = await getPolicyById(policy_id);
        if (!policy) {
            return reply.status(404).send({
                request_id: request.id,
                timestamp: new Date().toISOString(),
                version: 'v1',
                error: { code: 'not_found', message: 'Policy not found' },
            });
        }
        const updated = await setPolicyVersionStatus(policy_id, 'active');
        if (!updated) {
            return reply.status(404).send({
                request_id: request.id,
                timestamp: new Date().toISOString(),
                version: 'v1',
                error: { code: 'not_found', message: 'Policy not found' },
            });
        }
        const userId = request.user?.sub ?? request.headers['x-user-id'] ?? 'system';
        await writeAuditLog({
            entity_type: 'policy',
            entity_id: policy_id,
            action: 'enable',
            changes: {},
            user_id: userId,
            ip_address: request.ip,
            user_agent: request.headers['user-agent'] ?? null,
        });
        await publishInvalidation({ key: POLICIES_ACTIVE_KEY });
        await cacheDelete(policyKey(policy_id));
        return reply.send({
            request_id: request.id,
            timestamp: new Date().toISOString(),
            data: updated,
        });
    });
}
