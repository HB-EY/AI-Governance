/**
 * Versioned API routes under /v1.
 * Feature routes (agents, policies, etc.) are registered here as they are implemented.
 */

import type { FastifyInstance } from 'fastify';
import { meRoutes } from './me.js';
import { agentRoutes } from './agents.js';
import { policyRoutes } from './policies.js';
import { evidenceRoutes } from './evidence.js';
import { validationCheckRoutes } from './validation-checks.js';
import { validationRoutes } from './validation.js';
import { approvalRoutes } from './approvals.js';
import { gatewayRoutes } from './gateway.js';
import { dashboardRoutes } from './dashboard.js';

export async function v1Routes(app: FastifyInstance): Promise<void> {
  app.get('/', async (_request, reply) => {
    return reply.send({
      request_id: (reply.request as { id?: string }).id,
      timestamp: new Date().toISOString(),
      version: 'v1',
      data: { message: 'Agent Governance Control Plane API v1' },
    });
  });

  await app.register(meRoutes);
  await app.register(agentRoutes, { prefix: '/agents' });
  await app.register(policyRoutes, { prefix: '/policies' });
  await app.register(evidenceRoutes, { prefix: '/evidence' });
  await app.register(validationCheckRoutes, { prefix: '/validation-checks' });
  await app.register(validationRoutes, { prefix: '/validation' });
  await app.register(approvalRoutes, { prefix: '/approvals' });
  await app.register(gatewayRoutes, { prefix: '/gateway' });
  await app.register(dashboardRoutes, { prefix: '/dashboard' });
}
