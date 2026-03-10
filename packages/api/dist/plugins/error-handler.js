/**
 * Global error handler. Returns structured error responses (API Contracts).
 */
import { formatErrorsForApi } from '@ai-governance/shared';
const API_VERSION = 'v1';
function getStatusCode(err) {
    const code = err.code;
    if (code === 'FST_ERR_VALIDATION')
        return 400;
    if (code === 'FST_JWT_AUTHORIZATION_TOKEN_INVALID' || code === 'FST_JWT_NO_AUTHORIZATION_IN_HEADER')
        return 401;
    if (code === 'FST_ERR_NOT_FOUND')
        return 404;
    if (err.statusCode && err.statusCode >= 400)
        return err.statusCode;
    return 500;
}
function getErrorCode(err) {
    const code = err.code;
    if (code === 'FST_ERR_VALIDATION')
        return 'invalid_request';
    if (code?.startsWith('FST_JWT'))
        return 'authentication_required';
    if (code === 'FST_ERR_NOT_FOUND')
        return 'not_found';
    const status = err.statusCode ?? 500;
    if (status === 401)
        return 'authentication_required';
    if (status === 403)
        return 'forbidden';
    if (status === 404)
        return 'not_found';
    if (status === 429)
        return 'rate_limited';
    if (status >= 500)
        return 'internal_error';
    return 'invalid_request';
}
export async function errorHandler(err, request, reply) {
    const requestId = request.id ?? crypto.randomUUID();
    const timestamp = new Date().toISOString();
    const statusCode = getStatusCode(err);
    const code = getErrorCode(err);
    let message = err.message ?? 'An error occurred';
    let details;
    const validation = err.validation;
    if (validation && Array.isArray(validation)) {
        const formatted = formatErrorsForApi(validation.map((v) => ({
            path: v.instancePath?.replace(/^\//, '').replace(/\//g, '.') ?? 'body',
            message: v.message ?? 'Validation failed',
        })));
        message = formatted.message;
        details = formatted.details;
    }
    request.log.error({ err, requestId }, message);
    if (reply.sent)
        return;
    await reply.status(statusCode).send({
        request_id: requestId,
        timestamp,
        version: API_VERSION,
        error: {
            code,
            message,
            ...(details && { details }),
        },
    });
}
