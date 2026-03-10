/**
 * Control Plane Client SDK core (WO-51).
 * ControlPlaneClient with register(), submitAction(), waitForApproval(), retry, typed errors.
 */
import type { RegisterAgentRequest } from '@ai-governance/shared';
export interface ControlPlaneClientConfig {
    /** Base URL of the control plane API (e.g. http://localhost:3000) */
    gatewayUrl: string;
    /** Agent API key (Bearer token) for gateway actions */
    apiKey: string;
    /** Agent ID (set after register() or provided if pre-registered) */
    agentId?: string;
    retries?: number;
    submitTimeoutMs?: number;
    pollIntervalMs?: number;
}
export interface SubmitActionRequest {
    action_type: string;
    target_resource: string;
    parameters?: Record<string, unknown>;
    context?: Record<string, unknown>;
    reasoning?: string;
    output?: unknown;
}
export interface SubmitActionResult {
    request_id: string;
    trace_id: string;
    decision: 'allow' | 'allow-with-validation' | 'allow-with-approval';
    approval_id?: string;
    poll_url?: string;
    status?: string;
    outcome?: unknown;
}
export interface WaitForApprovalOptions {
    requestId: string;
    maxWaitMs?: number;
}
export interface ApprovalStatusResult {
    status: 'pending_approval' | 'approved' | 'denied' | 'expired';
    decision?: string;
    denial_reason?: string;
    trace_id?: string;
}
export declare class ControlPlaneClient {
    private readonly baseUrl;
    private readonly getToken;
    private _agentId;
    private readonly retries;
    private readonly submitTimeoutMs;
    private readonly pollIntervalMs;
    constructor(config: ControlPlaneClientConfig);
    get agentId(): string | undefined;
    /**
     * Register agent with the control plane. Returns agent_id and api_key.
     * Store api_key securely; it is shown only once.
     */
    register(request: RegisterAgentRequest): Promise<{
        agent_id: string;
        api_key: string;
    }>;
    /**
     * Submit an action through the gateway. Uses Bearer api_key for auth.
     * Retries on 5xx with exponential backoff. Throws typed errors on 4xx.
     */
    submitAction(request: SubmitActionRequest): Promise<SubmitActionResult>;
    /**
     * Poll gateway for approval status until approved, denied, or expired.
     * Throws ApprovalTimeoutError if maxWaitMs is exceeded while still pending.
     */
    waitForApproval(options: WaitForApprovalOptions): Promise<ApprovalStatusResult>;
}
