/**
 * Control Plane Client SDK core (WO-51).
 * ControlPlaneClient with register(), submitAction(), waitForApproval(), retry, typed errors.
 */
import { ApprovalTimeoutError, parseGatewayError, } from './errors.js';
const DEFAULT_RETRIES = 3;
const INITIAL_BACKOFF_MS = 500;
const DEFAULT_SUBMIT_TIMEOUT_MS = 30_000;
const DEFAULT_POLL_INTERVAL_MS = 2000;
function generateRequestId() {
    return crypto.randomUUID();
}
async function fetchWithRetry(url, init, retries, getToken) {
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${getToken()}`);
    headers.set('Content-Type', 'application/json');
    const requestId = generateRequestId();
    headers.set('X-Request-ID', requestId);
    let lastRes = null;
    for (let attempt = 0; attempt <= retries; attempt++) {
        const res = await fetch(url, { ...init, headers });
        lastRes = res;
        if (res.ok)
            return res;
        const retryable = res.status === 408 || res.status === 429 || res.status >= 500;
        if (!retryable || attempt >= retries)
            return res;
        const delay = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delay));
    }
    return lastRes;
}
export class ControlPlaneClient {
    baseUrl;
    getToken;
    _agentId;
    retries;
    submitTimeoutMs;
    pollIntervalMs;
    constructor(config) {
        this.baseUrl = config.gatewayUrl.replace(/\/$/, '');
        this.getToken = () => config.apiKey;
        this._agentId = config.agentId;
        this.retries = config.retries ?? DEFAULT_RETRIES;
        this.submitTimeoutMs = config.submitTimeoutMs ?? DEFAULT_SUBMIT_TIMEOUT_MS;
        this.pollIntervalMs = config.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
    }
    get agentId() {
        return this._agentId;
    }
    /**
     * Register agent with the control plane. Returns agent_id and api_key.
     * Store api_key securely; it is shown only once.
     */
    async register(request) {
        const url = `${this.baseUrl}/v1/agents`;
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request),
        });
        if (!res.ok) {
            const body = (await res.json().catch(() => ({})));
            throw new Error(body?.error?.message ?? `Registration failed: ${res.status}`);
        }
        const data = (await res.json());
        this._agentId = data.data.agent_id;
        return data.data;
    }
    /**
     * Submit an action through the gateway. Uses Bearer api_key for auth.
     * Retries on 5xx with exponential backoff. Throws typed errors on 4xx.
     */
    async submitAction(request) {
        if (!this._agentId)
            throw new Error('Agent not registered; call register() first');
        const url = `${this.baseUrl}/v1/gateway/actions`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.submitTimeoutMs);
        const res = await fetchWithRetry(url, {
            method: 'POST',
            signal: controller.signal,
            body: JSON.stringify({
                action_type: request.action_type,
                target_resource: request.target_resource,
                parameters: request.parameters,
                context: request.context,
                reasoning: request.reasoning,
                output: request.output,
            }),
        }, this.retries, this.getToken);
        clearTimeout(timeoutId);
        const body = (await res.json().catch(() => ({})));
        if (!res.ok) {
            throw parseGatewayError(res.status, body);
        }
        const data = (body.data ?? {});
        const requestId = (body.request_id ?? data.request_id ?? generateRequestId());
        return {
            request_id: requestId,
            trace_id: data.trace_id ?? '',
            decision: data.decision ?? 'allow',
            approval_id: data.approval_id,
            poll_url: data.poll_url,
            status: data.status,
            outcome: data.outcome,
        };
    }
    /**
     * Poll gateway for approval status until approved, denied, or expired.
     * Throws ApprovalTimeoutError if maxWaitMs is exceeded while still pending.
     */
    async waitForApproval(options) {
        const { requestId, maxWaitMs = 3600_000 } = options;
        const url = `${this.baseUrl}/v1/gateway/actions/${encodeURIComponent(requestId)}/status`;
        const start = Date.now();
        while (Date.now() - start < maxWaitMs) {
            const res = await fetchWithRetry(url, { method: 'GET' }, 0, this.getToken);
            const body = (await res.json().catch(() => ({})));
            if (!res.ok) {
                if (res.status === 404)
                    throw new ApprovalTimeoutError('Request not found or expired');
                throw new Error(body?.error?.message ?? `Status check failed: ${res.status}`);
            }
            const data = body.data ?? {};
            const status = (data.status ?? 'pending_approval');
            if (status !== 'pending_approval') {
                return {
                    status,
                    decision: data.decision,
                    denial_reason: data.denial_reason,
                    trace_id: data.trace_id,
                };
            }
            await new Promise((r) => setTimeout(r, this.pollIntervalMs));
        }
        throw new ApprovalTimeoutError(`Approval did not complete within ${maxWaitMs}ms`);
    }
}
