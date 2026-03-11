/**
 * Agent API key: JWT (agk_ prefix) and bcrypt hash for storage.
 * Key is returned only once at registration (REQ-AREG).
 */

import * as jose from 'jose';
import bcryptImport from 'bcryptjs';
import { AGENT_API_KEY_PREFIX } from '@ai-governance/shared';

// ESM interop: CJS bcryptjs may expose hash/compare on .default
type BcryptLike = { hash: (s: string, r: number) => Promise<string>; compare: (s: string, h: string) => Promise<boolean> };
const mod = bcryptImport as unknown as BcryptLike | { default: BcryptLike };
const bcrypt: BcryptLike = typeof (mod as BcryptLike).hash === 'function' ? (mod as BcryptLike) : (mod as { default: BcryptLike }).default;

const SALT_ROUNDS = 10;

/** Generate API key JWT with agentId and iat; prefix agk_ */
export async function generateAgentApiKey(agentId: string, secret: string): Promise<string> {
  const jwt = await new jose.SignJWT({ agentId })
    .setSubject(agentId)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .sign(new TextEncoder().encode(secret));
  return `${AGENT_API_KEY_PREFIX}${jwt}`;
}

/** Hash raw API key for storage (bcrypt). */
export function hashApiKey(rawKey: string): Promise<string> {
  return bcrypt.hash(rawKey, SALT_ROUNDS);
}

/** Verify a raw key against a stored hash. */
export function verifyApiKey(rawKey: string, hash: string): Promise<boolean> {
  return bcrypt.compare(rawKey, hash);
}
