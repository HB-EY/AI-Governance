/**
 * Downstream action execution (WO-42, WO-56): proxy with circuit breaker.
 */

import { CircuitBreaker } from './circuit-breaker.js';

const DEFAULT_TIMEOUT_MS = 30_000;
const downstreamCircuit = new CircuitBreaker({
  failureThreshold: 5,
  successThreshold: 2,
  openTimeoutMs: 30_000,
});

export interface DownstreamResult {
  success: boolean;
  status_code?: number;
  body?: unknown;
  error?: string;
}

export async function proxyToDownstream(
  actionType: string,
  targetResource: string,
  parameters: Record<string, unknown>,
  context?: Record<string, unknown>
): Promise<DownstreamResult> {
  const url = process.env.GATEWAY_DOWNSTREAM_URL ?? process.env.DOWNSTREAM_PROXY_URL;
  if (!url) {
    return { success: true, body: { message: 'No downstream configured' } };
  }
  if (!downstreamCircuit.canExecute()) {
    return { success: false, error: 'Downstream circuit open; try again later' };
  }
  const timeoutMs = Math.min(60_000, Math.max(1000, parseInt(process.env.GATEWAY_DOWNSTREAM_TIMEOUT_MS ?? String(DEFAULT_TIMEOUT_MS), 10)));
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action_type: actionType,
        target_resource: targetResource,
        parameters,
        context,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const text = await res.text();
    let body: unknown;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }
    if (!res.ok) {
      downstreamCircuit.recordFailure();
      return {
        success: false,
        status_code: res.status,
        body,
        error: `Downstream returned ${res.status}`,
      };
    }
    downstreamCircuit.recordSuccess();
    return { success: true, status_code: res.status, body };
  } catch (err) {
    downstreamCircuit.recordFailure();
    const message = err instanceof Error ? err.message : String(err);
    const isTimeout = message.includes('timeout') || message.includes('abort');
    return {
      success: false,
      error: isTimeout ? 'Downstream timeout' : message,
    };
  }
}
