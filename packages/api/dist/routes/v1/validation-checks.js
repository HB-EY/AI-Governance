/**
 * Validation check storage APIs (WO-29) and run-check endpoint.
 */
import { createValidator, formatErrorsForApi, createValidationCheckSchema, updateValidationCheckSchema, } from '@ai-governance/shared';
import { getValidationCheckById, listValidationChecks, createValidationCheck, updateValidationCheck, findValidationCheckByName, } from '../../db/validation-checks.js';
import { writeAuditLog } from '../../services/audit.js';
import { validateAgainstSchema } from '../../services/schema-validator.js';
import { detectPii } from '../../services/pii-detector.js';
import { analyzeSentiment } from '../../services/sentiment-analyzer.js';
import { validateBusinessRule } from '../../services/business-rule-validator.js';
import { isUniqueViolation } from '../../db/errors.js';
const validateCreate = createValidator(createValidationCheckSchema);
const validateUpdate = createValidator(updateValidationCheckSchema);
export async function validationCheckRoutes(app) {
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
        const existing = await findValidationCheckByName(body.name);
        if (existing) {
            return reply.status(409).send({
                request_id: request.id,
                timestamp: new Date().toISOString(),
                version: 'v1',
                error: { code: 'conflict', message: 'Validation check name already exists' },
            });
        }
        const userId = request.user?.sub ?? request.headers['x-user-id'] ?? 'system';
        let check;
        try {
            check = await createValidationCheck(body, userId);
        }
        catch (err) {
            if (isUniqueViolation(err)) {
                return reply.status(409).send({
                    request_id: request.id,
                    timestamp: new Date().toISOString(),
                    version: 'v1',
                    error: { code: 'conflict', message: 'Validation check name already exists' },
                });
            }
            throw err;
        }
        await writeAuditLog({
            entity_type: 'validation_check',
            entity_id: check.id,
            action: 'create',
            changes: { name: body.name, check_type: body.check_type },
            user_id: userId,
            ip_address: request.ip,
            user_agent: request.headers['user-agent'] ?? null,
        });
        return reply.status(201).send({
            request_id: request.id,
            timestamp: new Date().toISOString(),
            data: check,
        });
    });
    app.get('/:check_id', async (request, reply) => {
        const { check_id } = request.params;
        const check = await getValidationCheckById(check_id);
        if (!check) {
            return reply.status(404).send({
                request_id: request.id,
                timestamp: new Date().toISOString(),
                version: 'v1',
                error: { code: 'not_found', message: 'Validation check not found' },
            });
        }
        return reply.send({
            request_id: request.id,
            timestamp: new Date().toISOString(),
            data: check,
        });
    });
    app.get('/', async (request, reply) => {
        const q = request.query;
        const items = await listValidationChecks({ check_type: q.check_type, status: q.status });
        return reply.send({
            request_id: request.id,
            timestamp: new Date().toISOString(),
            data: { items },
        });
    });
    app.patch('/:check_id', {
        preHandler: [app.requireUserAuth()],
    }, async (request, reply) => {
        const { check_id } = request.params;
        const result = validateUpdate(request.body ?? {});
        if (!result.success) {
            return reply.status(400).send({
                request_id: request.id,
                timestamp: new Date().toISOString(),
                version: 'v1',
                error: { code: 'invalid_request', message: 'Validation failed', details: formatErrorsForApi(result.errors) },
            });
        }
        const userId = request.user?.sub ?? request.headers['x-user-id'] ?? 'system';
        const updated = await updateValidationCheck(check_id, result.data, userId);
        if (!updated) {
            return reply.status(404).send({
                request_id: request.id,
                timestamp: new Date().toISOString(),
                version: 'v1',
                error: { code: 'not_found', message: 'Validation check not found' },
            });
        }
        await writeAuditLog({
            entity_type: 'validation_check',
            entity_id: check_id,
            action: 'update',
            changes: result.data,
            user_id: userId,
            ip_address: request.ip,
            user_agent: request.headers['user-agent'] ?? null,
        });
        return reply.send({
            request_id: request.id,
            timestamp: new Date().toISOString(),
            data: updated,
        });
    });
    app.post('/:check_id/run', async (request, reply) => {
        const { check_id } = request.params;
        const body = request.body ?? {};
        const check = await getValidationCheckById(check_id);
        if (!check) {
            return reply.status(404).send({
                request_id: request.id,
                timestamp: new Date().toISOString(),
                version: 'v1',
                error: { code: 'not_found', message: 'Validation check not found' },
            });
        }
        if (check.status !== 'active') {
            return reply.status(400).send({
                request_id: request.id,
                timestamp: new Date().toISOString(),
                version: 'v1',
                error: { code: 'invalid_request', message: 'Validation check is disabled' },
            });
        }
        if (check.check_type === 'schema') {
            const schema = check.configuration?.schema;
            const payload = body.payload ?? check.configuration?.payload;
            if (!schema) {
                return reply.status(400).send({
                    request_id: request.id,
                    timestamp: new Date().toISOString(),
                    version: 'v1',
                    error: { code: 'invalid_request', message: 'Schema check requires configuration.schema' },
                });
            }
            const result = validateAgainstSchema(schema, payload);
            return reply.send({
                request_id: request.id,
                timestamp: new Date().toISOString(),
                data: {
                    check_id,
                    check_type: 'schema',
                    pass: result.pass,
                    errors: result.errors,
                },
            });
        }
        if (check.check_type === 'pii') {
            const text = body.text ?? (typeof body.payload === 'string' ? body.payload : JSON.stringify(body.payload ?? ''));
            const config = {
                types_to_check: check.configuration?.types_to_check,
                action: check.configuration?.action,
            };
            const result = detectPii(text, config);
            return reply.send({
                request_id: request.id,
                timestamp: new Date().toISOString(),
                data: {
                    check_id,
                    check_type: 'pii',
                    pass: result.pass,
                    action: result.action,
                    detected_types: result.detected_types,
                    message: result.message,
                },
            });
        }
        if (check.check_type === 'sentiment') {
            const text = body.text ?? (typeof body.payload === 'string' ? body.payload : JSON.stringify(body.payload ?? ''));
            const result = await analyzeSentiment(text, {
                threshold: check.configuration?.threshold,
                api_url: check.configuration?.api_url,
                api_key: check.configuration?.api_key,
            });
            return reply.send({
                request_id: request.id,
                timestamp: new Date().toISOString(),
                data: {
                    check_id,
                    check_type: 'sentiment',
                    pass: result.pass,
                    score: result.score,
                    message: result.message,
                },
            });
        }
        if (check.check_type === 'business-rule') {
            const actionData = body.payload ?? {};
            const endpointUrl = check.configuration?.endpoint_url;
            if (!endpointUrl) {
                return reply.status(400).send({
                    request_id: request.id,
                    timestamp: new Date().toISOString(),
                    version: 'v1',
                    error: { code: 'invalid_request', message: 'Business rule check requires configuration.endpoint_url' },
                });
            }
            const result = await validateBusinessRule(actionData, {
                endpoint_url: endpointUrl,
                timeout_seconds: check.timeout_seconds,
                method: check.configuration?.method,
            });
            return reply.send({
                request_id: request.id,
                timestamp: new Date().toISOString(),
                data: {
                    check_id,
                    check_type: 'business-rule',
                    pass: result.pass,
                    message: result.message,
                    rule_violated: result.rule_violated,
                },
            });
        }
        return reply.status(400).send({
            request_id: request.id,
            timestamp: new Date().toISOString(),
            version: 'v1',
            error: { code: 'invalid_request', message: `Unsupported check_type: ${check.check_type}` },
        });
    });
}
