/**
 * Dashboard metrics API (WO-43): aggregate counts, 30s cache.
 * When user auth is not configured (no USER_JWT_SECRET), allows unauthenticated access for local dev.
 */
import type { FastifyInstance } from 'fastify';
export declare function dashboardRoutes(app: FastifyInstance): Promise<void>;
