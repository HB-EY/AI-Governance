/**
 * Shared constants for the Agent Governance Control Plane.
 */
/** Default page size for list endpoints (API Contracts) */
export const DEFAULT_PAGE_SIZE = 50;
/** Maximum page size for list endpoints */
export const MAX_PAGE_SIZE = 100;
/** Default validation check timeout in seconds */
export const DEFAULT_VALIDATION_TIMEOUT_SECONDS = 5;
/** Idempotency key retention hours (API Contracts: 24 hours) */
export const IDEMPOTENCY_RETENTION_HOURS = 24;
/** Agent API key prefix (e.g. agk_...) */
export const AGENT_API_KEY_PREFIX = 'agk_';
/** Capability types valid for agent registration (REQ-AREG-001.4) */
export const VALID_CAPABILITY_TYPES = [
    'read',
    'propose_change',
    'commit_change',
    'query',
    'execute_tool',
    'call_model',
];
/** Common action types for traces */
export const ACTION_TYPES = [
    'read',
    'propose_change',
    'commit_change',
    'query',
    'execute_tool',
    'call_model',
];
