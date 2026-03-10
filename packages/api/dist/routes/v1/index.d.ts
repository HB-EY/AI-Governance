/**
 * Versioned API routes under /v1.
 * Feature routes (agents, policies, etc.) are registered here as they are implemented.
 */
import type { FastifyInstance } from 'fastify';
export declare function v1Routes(app: FastifyInstance): Promise<void>;
