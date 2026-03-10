/**
 * Authentication middleware: agent API keys (JWT with agk_ prefix) and user/session tokens.
 * API Contracts: Authorization: Bearer <token>. 401 for missing/invalid.
 */
import * as jose from 'jose';
import { AGENT_API_KEY_PREFIX } from '@ai-governance/shared';
const AUTH_HEADER = 'authorization';
const BEARER_PREFIX = 'bearer ';
function getBearerToken(req) {
    const raw = req.headers[AUTH_HEADER];
    if (typeof raw !== 'string' || !raw.toLowerCase().startsWith(BEARER_PREFIX))
        return null;
    return raw.slice(BEARER_PREFIX.length).trim() || null;
}
function isAgentToken(token) {
    return token.startsWith(AGENT_API_KEY_PREFIX);
}
async function verifyAgentJwt(token, secret) {
    try {
        const jwt = token.startsWith(AGENT_API_KEY_PREFIX) ? token.slice(AGENT_API_KEY_PREFIX.length) : token;
        const key = new TextEncoder().encode(secret);
        const { payload } = await jose.jwtVerify(jwt, key, {
            algorithms: ['HS256'],
            clockTolerance: 10,
        });
        const agentId = payload.agentId ?? payload.sub;
        if (typeof agentId !== 'string')
            return null;
        return { agentId, iat: payload.iat, exp: payload.exp };
    }
    catch {
        return null;
    }
}
async function verifyUserJwt(token, secret) {
    try {
        const key = new TextEncoder().encode(secret);
        const { payload } = await jose.jwtVerify(token, key, {
            algorithms: ['HS256', 'RS256'],
            clockTolerance: 10,
        });
        const sub = payload.sub;
        if (!sub)
            return null;
        const roles = Array.isArray(payload.roles) ? payload.roles : undefined;
        const email = typeof payload.email === 'string' ? payload.email : undefined;
        return { sub, roles, email };
    }
    catch {
        return null;
    }
}
async function send401(reply, requestId, message) {
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
export const authPlugin = async (app, opts) => {
    const agentSecret = opts.agentJwtSecret ?? process.env.AGENT_JWT_SECRET ?? process.env.JWT_SECRET;
    const userSecret = opts.userJwtSecret ?? process.env.USER_JWT_SECRET ?? process.env.JWT_SECRET;
    if (!agentSecret) {
        app.log.warn('AGENT_JWT_SECRET (or JWT_SECRET) not set; agent authentication will reject all requests.');
    }
    app.decorate('requireAgentAuth', function requireAgentAuth() {
        return async (request, reply) => {
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
        return async (request, reply) => {
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
        return async (request, _reply) => {
            const token = getBearerToken(request);
            if (!token || !isAgentToken(token) || !agentSecret)
                return;
            const payload = await verifyAgentJwt(token, agentSecret);
            if (payload) {
                request.agentId = payload.agentId;
                request.authType = 'agent';
            }
        };
    });
};
