/**
 * Agent API key: JWT (agk_ prefix) and bcrypt hash for storage.
 * Key is returned only once at registration (REQ-AREG).
 */
/** Generate API key JWT with agentId and iat; prefix agk_ */
export declare function generateAgentApiKey(agentId: string, secret: string): Promise<string>;
/** Hash raw API key for storage (bcrypt). */
export declare function hashApiKey(rawKey: string): Promise<string>;
/** Verify a raw key against a stored hash. */
export declare function verifyApiKey(rawKey: string, hash: string): Promise<boolean>;
