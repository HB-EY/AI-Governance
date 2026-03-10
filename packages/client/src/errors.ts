/**
 * Typed errors for Control Plane SDK (WO-51).
 * Parse structured error responses from the gateway API.
 */

export class ActionDeniedError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'ActionDeniedError';
  }
}

export class ValidationFailedError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: { checks_run?: unknown[] }
  ) {
    super(message);
    this.name = 'ValidationFailedError';
  }
}

export class ApprovalTimeoutError extends Error {
  constructor(message: string = 'Approval request timed out') {
    super(message);
    this.name = 'ApprovalTimeoutError';
  }
}

export class GatewayUnavailableError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'GatewayUnavailableError';
  }
}

export interface ApiErrorBody {
  error?: { code?: string; message?: string; details?: unknown };
}

export function parseGatewayError(status: number, body: ApiErrorBody): Error {
  const msg = body?.error?.message ?? `Request failed with status ${status}`;
  const code = body?.error?.code ?? 'unknown';
  const details = body?.error?.details;

  if (status >= 500) return new GatewayUnavailableError(msg, status);
  if (status === 403 && (code === 'policy_denied' || code === 'forbidden'))
    return new ActionDeniedError(msg, code, details);
  if (status === 403 && code === 'validation_failed')
    return new ValidationFailedError(msg, code, details as { checks_run?: unknown[] });
  if (status === 403 && (code === 'approval_denied' || code === 'expired'))
    return new ActionDeniedError(msg, code, details);

  return new Error(msg);
}
