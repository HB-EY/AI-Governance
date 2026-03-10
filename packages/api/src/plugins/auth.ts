/**
 * Authentication middleware: agent API keys (JWT with agk_ prefix) and user/session tokens.
 * API Contracts: Authorization: Bearer <token>. 401 for missing/invalid.
 */

import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import * as jose from 'jose';
import { AGENT_API_KEY_PREFIX } from '@ai-governance/shared';

const AUTH_HEADER = 'authorization';
const BEARER_PREFIX = 'bearer ';

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

function getBearerToken(req: FastifyRequest): string | null {
  const raw = req.headers[AUTH_HEADER];
  if (typeof raw !== 'string' || !raw.toLowerCase().startsWith(BEARER_PREFIX)) return null;
  return raw.slice(BEARER_PREFIX.length).trim() || null;
}

function isAgentToken(token: string): boolean {
  return token.startsWith(AGENT_API_KEY_PREFIX);
}

async function verifyAgentJwt(token: string, secret: string): Promise<AgentAuthPayload | null> {
  try {
    const jwt = token.startsWith(AGENT_API_KEY_PREFIX) ? token.slice(AGENT_API_KEY_PREFIX.length) : token;
    const key = new TextEncoder().encode(secret);
    const { payload } = await jose.jwtVerify(jwt, key, {
      algorithms: ['HS256'],
      clockTolerance: 10,
    });
    const agentId = payload.agentId ?? payload.sub;
    if (typeof agentId !== 'string') return null;
    return { agentId, iat: payload.iat, exp: payload.exp };
  } catch {
    return null;
  }
}

async function verifyUserJwt(token: string, secret: string): Promise<UserAuthPayload | null> {
  try {
    const key = new TextEncoder().encode(secret);
    const { payload } = await jose.jwtVerify(token, key, {
      algorithms: ['HS256', 'RS256'],
      clockTolerance: 10,
    });
    const sub = payload.sub as string;
    if (!sub) return null;
    const roles = Array.isArray(payload.roles) ? payload.roles as string[] : undefined;
    const email = typeof payload.email === 'string' ? payload.email : undefined;
    return { sub, roles, email };
  } catch {
    return null;
  }
}

async function send401(reply: FastifyReply, requestId: string, message: string): Promise<void> {
  await reply.status(401).send({
    request_id: requestId,
    timestamp: new Date().toISOString(),
    version: 'v1',
    error: {
      code: 'authentication_required',
      message,
    },
  });
}

export const authPlugin: FastifyPluginAsync<{
  agentJwtSecret: string;
  userJwtSecret?: string;
}> = async (app, opts) => {
  const agentSecret = opts.agentJwtSecret ?? process.env.AGENT_JWT_SECRET ?? process.env.JWT_SECRET;
  const userSecret = opts.userJwtSecret ?? process.env.USER_JWT_SECRET ?? process.env.JWT_SECRET;

  if (!agentSecret) {
    app.log.warn('AGENT_JWT_SECRET (or JWT_SECRET) not set; agent authentication will reject all requests.');
  }

  app.decorate('requireAgentAuth', function requireAgentAuth() {
    return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const token = getBearerToken(request);
      if (!token) {
        await send401(reply, request.id ?? '', 'Missing Authorization header or Bearer token.');
        return;
      }
      if (!isAgentToken(token)) {
        await send401(reply, request.id ?? '', 'Invalid agent token: expected Bearer agk_...');
        return;
      }
      if (!agentSecret) {
        await send401(reply, request.id ?? '', 'Agent authentication is not configured.');
        return;
      }
      const payload = await verifyAgentJwt(token, agentSecret);
      if (!payload) {
        await send401(reply, request.id ?? '', 'Invalid or expired agent API key.');
        return;
      }
      request.agentId = payload.agentId;
      request.authType = 'agent';
      request.log.info({ agentId: payload.agentId }, 'Agent authenticated');
    };
  });

  app.decorate('requireUserAuth', function requireUserAuth() {
    return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const token = getBearerToken(request);
      if (!token) {
        await send401(reply, request.id ?? '', 'Missing Authorization header or Bearer token.');
        return;
      }
      if (isAgentToken(token)) {
        await send401(reply, request.id ?? '', 'User endpoint does not accept agent API keys.');
        return;
      }
      const secret = userSecret ?? agentSecret;
      if (!secret) {
        await send401(reply, request.id ?? '', 'User authentication is not configured.');
        return;
      }
      const payload = await verifyUserJwt(token, secret);
      if (!payload) {
        await send401(reply, request.id ?? '', 'Invalid or expired session token.');
        return;
      }
      request.user = payload;
      request.authType = 'user';
      request.log.info({ userId: payload.sub }, 'User authenticated');
    };
  });

  app.decorate('optionalAgentAuth', function optionalAgentAuth() {
    return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
      const token = getBearerToken(request);
      if (!token || !isAgentToken(token) || !agentSecret) return;
      const payload = await verifyAgentJwt(token, agentSecret);
      if (payload) {
        request.agentId = payload.agentId;
        request.authType = 'agent';
      }
    };
  });
};

declare module 'fastify' {
  interface FastifyInstance {
    requireAgentAuth: () => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireUserAuth: () => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    optionalAgentAuth: () => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
