/**
 * Agent API key: JWT (agk_ prefix) and bcrypt hash for storage.
 * Key is returned only once at registration (REQ-AREG).
 */
import * as jose from 'jose';
import bcryptImport from 'bcryptjs';
import { AGENT_API_KEY_PREFIX } from '@ai-governance/shared';
const mod = bcryptImport;
const bcrypt = typeof mod.hash === 'function' ? mod : mod.default;
const SALT_ROUNDS = 10;
/** Generate API key JWT with agentId and iat; prefix agk_ */
export async function generateAgentApiKey(agentId, secret) {
    const jwt = await new jose.SignJWT({ agentId })
        .setSubject(agentId)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .sign(new TextEncoder().encode(secret));
    return `${AGENT_API_KEY_PREFIX}${jwt}`;
}
/** Hash raw API key for storage (bcrypt). */
export function hashApiKey(rawKey) {
    return bcrypt.hash(rawKey, SALT_ROUNDS);
}
/** Verify a raw key against a stored hash. */
export function verifyApiKey(rawKey, hash) {
    return bcrypt.compare(rawKey, hash);
}
