/**
 * Shared constants for the Agent Governance Control Plane.
 */
/** Default page size for list endpoints (API Contracts) */
export declare const DEFAULT_PAGE_SIZE = 50;
/** Maximum page size for list endpoints */
export declare const MAX_PAGE_SIZE = 100;
/** Default validation check timeout in seconds */
export declare const DEFAULT_VALIDATION_TIMEOUT_SECONDS = 5;
/** Idempotency key retention hours (API Contracts: 24 hours) */
export declare const IDEMPOTENCY_RETENTION_HOURS = 24;
/** Agent API key prefix (e.g. agk_...) */
export declare const AGENT_API_KEY_PREFIX = "agk_";
/** Capability types valid for agent registration (REQ-AREG-001.4) */
export declare const VALID_CAPABILITY_TYPES: readonly ["read", "propose_change", "commit_change", "query", "execute_tool", "call_model"];
export type CapabilityType = (typeof VALID_CAPABILITY_TYPES)[number];
/** Common action types for traces */
export declare const ACTION_TYPES: readonly ["read", "propose_change", "commit_change", "query", "execute_tool", "call_model"];
export type ActionType = (typeof ACTION_TYPES)[number];
//# sourceMappingURL=constants.d.ts.map