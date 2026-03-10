/**
 * Authentication middleware: agent API keys (JWT with agk_ prefix) and user/session tokens.
 * API Contracts: Authorization: Bearer <token>. 401 for missing/invalid.
 */
import type { FastifyPluginAsync } from 'fastify';
export interface AgentAuthPayload {
    agentId: string;
    iat?: number;
    exp?: number;
}
export interface UserAuthPayload {
    sub: string;
    roles?: string[];
    email?: string;
}
declare module 'fastify' {
    interface FastifyRequest {
        agentId?: string;
        user?: UserAuthPayload;
        authType?: 'agent' | 'user';
    }
}
export declare const authPlugin: FastifyPluginAsync<{
    agentJwtSecret: string;
    userJwtSecret?: string;
}>;
declare module 'fastify' {
    interface FastifyInstance {
        requireAgentAuth: () => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
        requireUserAuth: () => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
        optionalAgentAuth: () => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    }
}
