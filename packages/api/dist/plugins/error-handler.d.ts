/**
 * Global error handler. Returns structured error responses (API Contracts).
 */
import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
export declare function errorHandler(err: FastifyError, request: FastifyRequest, reply: FastifyReply): Promise<void>;
