/**
 * Typed errors for Control Plane SDK (WO-51).
 * Parse structured error responses from the gateway API.
 */
export declare class ActionDeniedError extends Error {
    readonly code: string;
    readonly details?: unknown;
    constructor(message: string, code: string, details?: unknown);
}
export declare class ValidationFailedError extends Error {
    readonly code: string;
    readonly details?: {
        checks_run?: unknown[];
    } | undefined;
    constructor(message: string, code: string, details?: {
        checks_run?: unknown[];
    } | undefined);
}
export declare class ApprovalTimeoutError extends Error {
    constructor(message?: string);
}
export declare class GatewayUnavailableError extends Error {
    readonly statusCode?: number | undefined;
    constructor(message: string, statusCode?: number | undefined);
}
export interface ApiErrorBody {
    error?: {
        code?: string;
        message?: string;
        details?: unknown;
    };
}
export declare function parseGatewayError(status: number, body: ApiErrorBody): Error;
