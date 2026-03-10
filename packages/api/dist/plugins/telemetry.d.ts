/**
 * OpenTelemetry: add request attributes to the current span (requestId, agentId, actionType, status).
 */
import type { FastifyPluginAsync } from 'fastify';
export declare const telemetryPlugin: FastifyPluginAsync;
/**
 * Create a child span for policy evaluation, validation, or downstream calls.
 */
export declare function startSpan(name: string, attributes?: Record<string, string | number | boolean>): import("@opentelemetry/api").Span;
