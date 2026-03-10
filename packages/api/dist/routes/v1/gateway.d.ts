/**
 * Gateway action submission (WO-39, 40): receive action, validate agent, evaluate policy, handle decisions.
 */
import type { FastifyInstance } from 'fastify';
export declare function gatewayRoutes(app: FastifyInstance): Promise<void>;
