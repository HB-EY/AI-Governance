/**
 * Validation runner orchestration (WO-33): POST /v1/validation/run
 */

import type { FastifyInstance } from 'fastify';
import { listValidationChecks } from '../../db/validation-checks.js';
import { runValidation } from '../../services/validation-runner.js';

export async function validationRoutes(app: FastifyInstance): Promise<void> {
  app.post<{
    Body: {
      action?: Record<string, unknown>;
      output?: unknown;
      validation_types: string[];
    };
  }>('/run', async (request, reply) => {
    const body = (request.body as { action?: Record<string, unknown>; output?: unknown; validation_types?: string[] }) ?? {};
    const validationTypes = body.validation_types;
    if (!Array.isArray(validationTypes) || validationTypes.length === 0) {
      return reply.status(400).send({
        request_id: request.id,
        timestamp: new Date().toISOString(),
        version: 'v1',
        error: { code: 'invalid_request', message: 'validation_types array required' },
      });
    }
    const allActive = await listValidationChecks({ status: 'active' });
    const checks = allActive.filter((c) => validationTypes.includes(c.check_type));
    if (checks.length === 0) {
      return reply.send({
        request_id: request.id,
        timestamp: new Date().toISOString(),
        data: {
          result: 'pass',
          checks_run: [],
          overall_duration_ms: 0,
        },
      });
    }
    const runResult = await runValidation(checks, {
      action: body.action,
      output: body.output,
      text: typeof body.output === 'string' ? body.output : undefined,
    });
    return reply.send({
      request_id: request.id,
      timestamp: new Date().toISOString(),
      data: runResult,
    });
  });
}
