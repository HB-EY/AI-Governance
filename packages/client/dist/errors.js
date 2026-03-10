/**
 * Typed errors for Control Plane SDK (WO-51).
 * Parse structured error responses from the gateway API.
 */
export class ActionDeniedError extends Error {
    code;
    details;
    constructor(message, code, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'ActionDeniedError';
    }
}
export class ValidationFailedError extends Error {
    code;
    details;
    constructor(message, code, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'ValidationFailedError';
    }
}
export class ApprovalTimeoutError extends Error {
    constructor(message = 'Approval request timed out') {
        super(message);
        this.name = 'ApprovalTimeoutError';
    }
}
export class GatewayUnavailableError extends Error {
    statusCode;
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.name = 'GatewayUnavailableError';
    }
}
export function parseGatewayError(status, body) {
    const msg = body?.error?.message ?? `Request failed with status ${status}`;
    const code = body?.error?.code ?? 'unknown';
    const details = body?.error?.details;
    if (status >= 500)
        return new GatewayUnavailableError(msg, status);
    if (status === 403 && (code === 'policy_denied' || code === 'forbidden'))
        return new ActionDeniedError(msg, code, details);
    if (status === 403 && code === 'validation_failed')
        return new ValidationFailedError(msg, code, details);
    if (status === 403 && (code === 'approval_denied' || code === 'expired'))
        return new ActionDeniedError(msg, code, details);
    return new Error(msg);
}
