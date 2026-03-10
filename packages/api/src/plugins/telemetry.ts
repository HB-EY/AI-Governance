/**
 * OpenTelemetry: add request attributes to the current span (requestId, agentId, actionType, status).
 */

import type { FastifyPluginAsync } from 'fastify';
import { trace } from '@opentelemetry/api';
import { tracer, meter } from '../telemetry.js';

const spanAttributes = {
  requestId: 'http.request_id',
  agentId: 'ai_governance.agent_id',
  actionType: 'ai_governance.action_type',
  statusCode: 'http.response.status_code',
};

function getRoute(request: { method: string; url: string; routerPath?: string }): string {
  return (request as { routerPath?: string }).routerPath ?? request.url;
}

export const telemetryPlugin: FastifyPluginAsync = async (app) => {
  const requestCounter = meter.createCounter('http_requests_total', {
    description: 'Total HTTP requests',
  });
  const requestDuration = meter.createHistogram('http_request_duration_seconds', {
    description: 'HTTP request duration in seconds',
  });

  app.addHook('onRequest', async (request, _reply) => {
    const span = trace.getActiveSpan();
    if (span) {
      span.setAttribute(spanAttributes.requestId, request.id);
      const req = request as { agentId?: string };
      if (req.agentId) span.setAttribute(spanAttributes.agentId, req.agentId);
    }
  });

  app.addHook('onRequest', async (request, _reply) => {
    (request as { _telemetryStart?: number })._telemetryStart = performance.now();
  });

  app.addHook('onResponse', async function onResponse(request, reply) {
    const span = trace.getActiveSpan();
    if (span) {
      span.setAttribute(spanAttributes.statusCode, reply.statusCode);
    }
    const start = (request as { _telemetryStart?: number })._telemetryStart;
    if (typeof start === 'number') {
      const duration = (performance.now() - start) / 1000;
      const route = getRoute(request);
      requestDuration.record(duration, {
        method: request.method,
        route,
        status: String(reply.statusCode),
      });
      requestCounter.add(1, {
        method: request.method,
        route,
        status: String(reply.statusCode),
      });
    }
  });
};

/**
 * Create a child span for policy evaluation, validation, or downstream calls.
 */
export function startSpan(name: string, attributes?: Record<string, string | number | boolean>) {
  return tracer.startSpan(name, { attributes });
}
