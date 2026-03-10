/**
 * Agent registration and query APIs (WO-16, WO-17, WO-18).
 */
import { createValidator, formatErrorsForApi, VALID_CAPABILITY_TYPES, } from '@ai-governance/shared';
import { registerAgentSchema } from '@ai-governance/shared';
import { getPool } from '../../db/pool.js';
import { createAgent, getAgentById, listAgents, findAgentByName, updateAgentMetadata, updateAgentStatus, } from '../../db/agents.js';
import { generateAgentApiKey, hashApiKey } from '../../services/agent-api-key.js';
import { writeAuditLog } from '../../services/audit.js';
import { agentKey } from '../../cache/keys.js';
import { cacheGet, cacheSet, cacheDelete } from '../../cache/store.js';
import { publishInvalidation } from '../../cache/invalidate.js';
import { isUniqueViolation } from '../../db/errors.js';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@ai-governance/shared';
const validateRegister = createValidator(registerAgentSchema);
/** Owner format: allow alphanumeric, email, or UUID (identity provider patterns). */
function isValidOwner(ownerId) {
    if (!ownerId || ownerId.length > 255)
        return false;
    return /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(ownerId) ||
        /^[a-f0-9-]{36}$/i.test(ownerId) ||
        /^[a-zA-Z0-9._-]+$/.test(ownerId);
}
export async function agentRoutes(app) {
    const agentJwtSecret = process.env.AGENT_JWT_SECRET ?? process.env.JWT_SECRET ?? '';
    app.post('/', {
        schema: {
            description: 'Register a new agent. Returns agent_id and api_key (shown once).',
            tags: ['Agents'],
            body: {
                type: 'object',
                required: ['name', 'owner_id', 'capabilities'],
                properties: {
                    name: { type: 'string', minLength: 1, maxLength: 255 },
                    description: { type: 'string' },
                    owner_id: { type: 'string', minLength: 1 },
                    owner_email: { type: 'string' },
                    capabilities: { type: 'array', items: { type: 'string', enum: [...VALID_CAPABILITY_TYPES] } },
                },
            },
            response: {
                201: {
                    type: 'object',
                    properties: {
                        request_id: { type: 'string' },
                        timestamp: { type: 'string', format: 'date-time' },
                        data: {
                            type: 'object',
                            properties: {
                                agent_id: { type: 'string', format: 'uuid' },
                                api_key: { type: 'string' },
                            },
                        },
                    },
                },
            },
        },
    }, async (request, reply) => {
        const result = validateRegister(request.body);
        if (!result.success) {
            return reply.status(400).send({
                request_id: request.id,
                timestamp: new Date().toISOString(),
                version: 'v1',
                error: {
                    code: 'invalid_request',
                    message: 'Validation failed',
                    details: formatErrorsForApi(result.errors),
                },
            });
        }
        const body = result.data;
        if (!isValidOwner(body.owner_id)) {
            return reply.status(400).send({
                request_id: request.id,
                timestamp: new Date().toISOString(),
                version: 'v1',
                error: {
                    code: 'invalid_request',
                    message: 'Invalid owner_id format',
                    details: [{ path: 'owner_id', message: 'Must be a valid user/team identifier (email, UUID, or alphanumeric).' }],
                },
            });
        }
        const validSet = new Set(VALID_CAPABILITY_TYPES);
        const invalidCaps = body.capabilities.filter((c) => !validSet.has(c));
        if (invalidCaps.length > 0) {
            return reply.status(400).send({
                request_id: request.id,
                timestamp: new Date().toISOString(),
                version: 'v1',
                error: {
                    code: 'invalid_request',
                    message: 'Invalid capabilities',
                    details: [{ path: 'capabilities', message: `Invalid types: ${invalidCaps.join(', ')}. Valid: ${VALID_CAPABILITY_TYPES.join(', ')}` }],
                },
            });
        }
        const existing = await findAgentByName(body.name);
        if (existing) {
            return reply.status(409).send({
                request_id: request.id,
                timestamp: new Date().toISOString(),
                version: 'v1',
                error: { code: 'conflict', message: 'Agent name already exists' },
            });
        }
        const agentId = crypto.randomUUID();
        const rawKey = await generateAgentApiKey(agentId, agentJwtSecret);
        const apiKeyHash = await hashApiKey(rawKey);
        try {
            const userId = request.headers['x-user-id'] ?? body.owner_id;
            await createAgent({
                id: agentId,
                name: body.name,
                description: body.description ?? null,
                owner_id: body.owner_id,
                owner_email: body.owner_email ?? null,
                api_key_hash: apiKeyHash,
                created_by: userId,
            }, body.capabilities);
            await writeAuditLog({
                entity_type: 'agent',
                entity_id: agentId,
                action: 'create',
                changes: { name: body.name, owner_id: body.owner_id, capabilities: body.capabilities },
                user_id: userId,
                ip_address: request.ip,
                user_agent: request.headers['user-agent'] ?? null,
            });
        }
        catch (err) {
            if (isUniqueViolation(err)) {
                return reply.status(409).send({
                    request_id: request.id,
                    timestamp: new Date().toISOString(),
                    version: 'v1',
                    error: { code: 'conflict', message: 'Agent name already exists' },
                });
            }
            throw err;
        }
        const response = { agent_id: agentId, api_key: rawKey };
        return reply.status(201).send({
            request_id: request.id,
            timestamp: new Date().toISOString(),
            data: response,
        });
    });
    app.get('/:agent_id', async (request, reply) => {
        const { agent_id } = request.params;
        const pool = getPool();
        const agent = await getAgentById(agent_id);
        if (!agent) {
            return reply.status(404).send({
                request_id: request.id,
                timestamp: new Date().toISOString(),
                version: 'v1',
                error: { code: 'not_found', message: 'Agent not found' },
            });
        }
        const cacheKey = agentKey(agent_id);
        const cached = await cacheGet(cacheKey);
        if (cached) {
            const parsed = JSON.parse(cached);
            return reply.send({
                request_id: request.id,
                timestamp: new Date().toISOString(),
                data: parsed,
            });
        }
        let actionsCount = 0;
        let violationsCount = 0;
        try {
            const actionsRes = await pool.query(`SELECT COUNT(*)::int AS c FROM traces WHERE agent_id = $1 AND request_timestamp >= NOW() - INTERVAL '30 days'`, [agent_id]);
            actionsCount = actionsRes.rows[0]?.c ?? 0;
            const violRes = await pool.query(`SELECT COUNT(*)::int AS c FROM traces WHERE agent_id = $1 AND status = 'denied' AND request_timestamp >= NOW() - INTERVAL '30 days'`, [agent_id]);
            violationsCount = violRes.rows[0]?.c ?? 0;
        }
        catch {
            // ignore
        }
        const payload = {
            ...agent,
            recent_actions_count_30d: actionsCount,
            recent_violations_count_30d: violationsCount,
        };
        await cacheSet(cacheKey, JSON.stringify(payload), 300);
        return reply.send({
            request_id: request.id,
            timestamp: new Date().toISOString(),
            data: payload,
        });
    });
    app.get('/', async (request, reply) => {
        const q = request.query;
        const page = Math.max(1, parseInt(q.page ?? '1', 10));
        const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(q.page_size ?? String(DEFAULT_PAGE_SIZE), 10)));
        const filters = {};
        if (q.status)
            filters.status = q.status;
        if (q.owner)
            filters.owner_id = q.owner;
        if (q.name)
            filters.name = q.name;
        const result = await listAgents({
            pagination: { page, pageSize },
            sort: { column: 'created_at', order: 'desc' },
            filters,
        });
        return reply.send({
            request_id: request.id,
            timestamp: new Date().toISOString(),
            data: {
                items: result.items,
                pagination: {
                    page: result.page,
                    page_size: result.pageSize,
                    total: result.total,
                    has_more: result.hasMore,
                },
            },
        });
    });
    app.patch('/:agent_id', {
        preHandler: [app.requireUserAuth()],
    }, async (request, reply) => {
        const { agent_id } = request.params;
        const body = request.body ?? {};
        const agent = await getAgentById(agent_id);
        if (!agent) {
            return reply.status(404).send({
                request_id: request.id,
                timestamp: new Date().toISOString(),
                version: 'v1',
                error: { code: 'not_found', message: 'Agent not found' },
            });
        }
        if (body.owner_id && !isValidOwner(body.owner_id)) {
            return reply.status(400).send({
                request_id: request.id,
                timestamp: new Date().toISOString(),
                version: 'v1',
                error: { code: 'invalid_request', message: 'Invalid owner_id format' },
            });
        }
        if (body.capabilities?.length) {
            const validSet = new Set(VALID_CAPABILITY_TYPES);
            const invalid = body.capabilities.filter((c) => !validSet.has(c));
            if (invalid.length > 0) {
                return reply.status(400).send({
                    request_id: request.id,
                    timestamp: new Date().toISOString(),
                    version: 'v1',
                    error: { code: 'invalid_request', message: `Invalid capabilities: ${invalid.join(', ')}` },
                });
            }
        }
        const updated = await updateAgentMetadata(agent_id, {
            description: body.description,
            owner_id: body.owner_id,
            owner_email: body.owner_email,
            capabilities: body.capabilities,
        });
        if (!updated)
            return reply.status(404).send({ request_id: request.id, timestamp: new Date().toISOString(), version: 'v1', error: { code: 'not_found', message: 'Agent not found' } });
        const userId = request.user?.sub ?? request.headers['x-user-id'] ?? 'system';
        await writeAuditLog({
            entity_type: 'agent',
            entity_id: agent_id,
            action: 'update',
            changes: { before: agent, after: updated },
            user_id: userId,
            ip_address: request.ip,
            user_agent: request.headers['user-agent'] ?? null,
        });
        await cacheDelete(agentKey(agent_id));
        await publishInvalidation({ key: agentKey(agent_id) });
        return reply.send({
            request_id: request.id,
            timestamp: new Date().toISOString(),
            data: updated,
        });
    });
    app.post('/:agent_id/disable', {
        preHandler: [app.requireUserAuth()],
    }, async (request, reply) => {
        const { agent_id } = request.params;
        const body = request.body ?? {};
        const agent = await getAgentById(agent_id);
        if (!agent) {
            return reply.status(404).send({
                request_id: request.id,
                timestamp: new Date().toISOString(),
                version: 'v1',
                error: { code: 'not_found', message: 'Agent not found' },
            });
        }
        const updated = await updateAgentStatus(agent_id, 'disabled');
        if (!updated)
            return reply.status(404).send({ request_id: request.id, timestamp: new Date().toISOString(), version: 'v1', error: { code: 'not_found', message: 'Agent not found' } });
        const userId = request.user?.sub ?? request.headers['x-user-id'] ?? 'system';
        await writeAuditLog({
            entity_type: 'agent',
            entity_id: agent_id,
            action: 'disable',
            changes: { reason: body.reason, previous_status: agent.status },
            user_id: userId,
            ip_address: request.ip,
            user_agent: request.headers['user-agent'] ?? null,
        });
        await cacheDelete(agentKey(agent_id));
        await publishInvalidation({ key: agentKey(agent_id) });
        return reply.send({
            request_id: request.id,
            timestamp: new Date().toISOString(),
            data: updated,
        });
    });
    app.post('/:agent_id/enable', {
        preHandler: [app.requireUserAuth()],
    }, async (request, reply) => {
        const { agent_id } = request.params;
        const body = request.body ?? {};
        const agent = await getAgentById(agent_id);
        if (!agent) {
            return reply.status(404).send({
                request_id: request.id,
                timestamp: new Date().toISOString(),
                version: 'v1',
                error: { code: 'not_found', message: 'Agent not found' },
            });
        }
        const updated = await updateAgentStatus(agent_id, 'active');
        if (!updated)
            return reply.status(404).send({ request_id: request.id, timestamp: new Date().toISOString(), version: 'v1', error: { code: 'not_found', message: 'Agent not found' } });
        const userId = request.user?.sub ?? request.headers['x-user-id'] ?? 'system';
        await writeAuditLog({
            entity_type: 'agent',
            entity_id: agent_id,
            action: 'enable',
            changes: { note: body.note, previous_status: agent.status },
            user_id: userId,
            ip_address: request.ip,
            user_agent: request.headers['user-agent'] ?? null,
        });
        await cacheDelete(agentKey(agent_id));
        await publishInvalidation({ key: agentKey(agent_id) });
        return reply.send({
            request_id: request.id,
            timestamp: new Date().toISOString(),
            data: updated,
        });
    });
}
