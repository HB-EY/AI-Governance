/**
 * JSON schema validation library.
 * Validates request bodies against schemas and returns structured errors
 * for API error responses (invalid_request, field-level details).
 */
import { Ajv } from 'ajv';
import addFormats from 'ajv-formats';
const defaultOptions = {
    removeAdditional: true,
    allErrors: true,
};
function makeAjv(options) {
    const ajv = new Ajv({
        strict: true,
        allErrors: options.allErrors,
        removeAdditional: options.removeAdditional ? 'all' : false,
    });
    addFormats(ajv);
    return ajv;
}
function toValidationErrors(errors) {
    if (!errors || errors.length === 0)
        return [];
    return errors.map((e) => ({
        path: e.instancePath ? e.instancePath.replace(/^\//, '').replace(/\//g, '.') : 'body',
        message: e.message ?? 'Validation failed',
        schemaPath: e.schemaPath,
        params: e.params,
    }));
}
/**
 * Create a validator function for a given JSON schema.
 * Returns a function that validates data and returns either { success, data } or { success, errors }.
 */
export function createValidator(schema, options = {}) {
    const opts = { ...defaultOptions, ...options };
    const ajv = makeAjv(opts);
    const validate = ajv.compile(schema);
    return (data) => {
        const ok = validate(data);
        if (ok) {
            return { success: true, data: data };
        }
        return {
            success: false,
            errors: toValidationErrors(validate.errors),
        };
    };
}
/**
 * Validate data against a schema (one-off validation).
 * Use createValidator when you need to reuse the same schema many times.
 */
export function validate(schema, data, options = {}) {
    const validator = createValidator(schema, options);
    return validator(data);
}
/**
 * Format validation errors for API error response (API Contracts: invalid_request, details).
 * Use in Fastify error handler or middleware to build the response body.
 */
export function formatErrorsForApi(errors) {
    const fields = {};
    for (const e of errors) {
        const key = e.path || 'body';
        if (!fields[key])
            fields[key] = [];
        fields[key].push(e.message);
    }
    const first = errors[0];
    const message = errors.length === 1
        ? first?.message ?? 'Validation failed'
        : `${errors.length} validation error(s)`;
    return {
        code: 'invalid_request',
        message,
        details: { fields },
    };
}
