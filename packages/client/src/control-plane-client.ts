/**
 * Control Plane Client SDK core (WO-51).
 * ControlPlaneClient with register(), submitAction(), waitForApproval(), retry, typed errors.
 */

import type { RegisterAgentRequest } from '@ai-governance/shared';
import {
  ActionDeniedError,
  ApprovalTimeoutError,
  GatewayUnavailableError,
  parseGatewayError,
} from './errors.js';

const DEFAULT_RETRIES = 3;
const INITIAL_BACKOFF_MS = 500;
const DEFAULT_SUBMIT_TIMEOUT_MS = 30_000;
const DEFAULT_POLL_INTERVAL_MS = 2000;

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

function generateRequestId(): string {
  return crypto.randomUUID();
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  retries: number,
  getToken: () => string
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${getToken()}`);
  headers.set('Content-Type', 'application/json');
  const requestId = generateRequestId();
  headers.set('X-Request-ID', requestId);

  let lastRes: Response | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, { ...init, headers });
    lastRes = res;
    if (res.ok) return res;
    const retryable = res.status === 408 || res.status === 429 || res.status >= 500;
    if (!retryable || attempt >= retries) return res;
    const delay = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
    await new Promise((r) => setTimeout(r, delay));
  }
  return lastRes!;
}

export class ControlPlaneClient {
  private readonly baseUrl: string;
  private readonly getToken: () => string;
  private _agentId: string | undefined;
  private readonly retries: number;
  private readonly submitTimeoutMs: number;
  private readonly pollIntervalMs: number;

  constructor(config: ControlPlaneClientConfig) {
    this.baseUrl = config.gatewayUrl.replace(/\/$/, '');
    this.getToken = () => config.apiKey;
    this._agentId = config.agentId;
    this.retries = config.retries ?? DEFAULT_RETRIES;
    this.submitTimeoutMs = config.submitTimeoutMs ?? DEFAULT_SUBMIT_TIMEOUT_MS;
    this.pollIntervalMs = config.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  }

  get agentId(): string | undefined {
    return this._agentId;
  }

  /**
   * Register agent with the control plane. Returns agent_id and api_key.
   * Store api_key securely; it is shown only once.
   */
  async register(request: RegisterAgentRequest): Promise<{ agent_id: string; api_key: string }> {
    const url = `${this.baseUrl}/v1/agents`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: { message?: string; code?: string } };
      throw new Error(body?.error?.message ?? `Registration failed: ${res.status}`);
    }
    const data = (await res.json()) as { data: { agent_id: string; api_key: string } };
    this._agentId = data.data.agent_id;
    return data.data;
  }

  /**
   * Submit an action through the gateway. Uses Bearer api_key for auth.
   * Retries on 5xx with exponential backoff. Throws typed errors on 4xx.
   */
  async submitAction(request: SubmitActionRequest): Promise<SubmitActionResult> {
    if (!this._agentId) throw new Error('Agent not registered; call register() first');
    const url = `${this.baseUrl}/v1/gateway/actions`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.submitTimeoutMs);

    const res = await fetchWithRetry(
      url,
      {
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
      },
      this.retries,
      this.getToken
    );
    clearTimeout(timeoutId);

    const body = (await res.json().catch(() => ({}))) as {
      request_id?: string;
      data?: Record<string, unknown>;
      error?: { code?: string; message?: string; details?: unknown };
    };

    if (!res.ok) {
      throw parseGatewayError(res.status, body);
    }

    const data = (body.data ?? {}) as Record<string, unknown>;
    const requestId = (body.request_id ?? data.request_id ?? generateRequestId()) as string;
    return {
      request_id: requestId,
      trace_id: (data.trace_id as string) ?? '',
      decision: (data.decision as SubmitActionResult['decision']) ?? 'allow',
      approval_id: data.approval_id as string | undefined,
      poll_url: data.poll_url as string | undefined,
      status: data.status as string | undefined,
      outcome: data.outcome,
    };
  }

  /**
   * Poll gateway for approval status until approved, denied, or expired.
   * Throws ApprovalTimeoutError if maxWaitMs is exceeded while still pending.
   */
  async waitForApproval(options: WaitForApprovalOptions): Promise<ApprovalStatusResult> {
    const { requestId, maxWaitMs = 3600_000 } = options;
    const url = `${this.baseUrl}/v1/gateway/actions/${encodeURIComponent(requestId)}/status`;
    const start = Date.now();

    while (Date.now() - start < maxWaitMs) {
      const res = await fetchWithRetry(
        url,
        { method: 'GET' },
        0,
        this.getToken
      );
      const body = (await res.json().catch(() => ({}))) as {
        data?: { status?: string; decision?: string; denial_reason?: string; trace_id?: string };
        error?: { message?: string };
      };

      if (!res.ok) {
        if (res.status === 404) throw new ApprovalTimeoutError('Request not found or expired');
        throw new Error(body?.error?.message ?? `Status check failed: ${res.status}`);
      }

      const data = body.data ?? {};
      const status = (data.status ?? 'pending_approval') as ApprovalStatusResult['status'];
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
