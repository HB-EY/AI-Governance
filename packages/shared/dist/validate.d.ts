/**
 * JSON schema validation library.
 * Validates request bodies against schemas and returns structured errors
 * for API error responses (invalid_request, field-level details).
 */
import { type AnySchemaObject } from 'ajv';
/** Single validation error for one field (AC-AREG-001.6: describe which fields are invalid) */
export interface ValidationErrorItem {
    path: string;
    message: string;
    schemaPath?: string;
    params?: Record<string, unknown>;
}
/** Result of validation: either success with data or failure with errors */
export type ValidationResult<T> = {
    success: true;
    data: T;
} | {
    success: false;
    errors: ValidationErrorItem[];
};
/** Options for createValidator */
export interface ValidatorOptions {
    /** Remove additional properties not in schema (default true) */
    removeAdditional?: boolean;
    /** Use all errors from AJV instead of first (default true) */
    allErrors?: boolean;
}
/**
 * Create a validator function for a given JSON schema.
 * Returns a function that validates data and returns either { success, data } or { success, errors }.
 */
export declare function createValidator<T>(schema: AnySchemaObject, options?: ValidatorOptions): (data: unknown) => ValidationResult<T>;
/**
 * Validate data against a schema (one-off validation).
 * Use createValidator when you need to reuse the same schema many times.
 */
export declare function validate<T>(schema: AnySchemaObject, data: unknown, options?: ValidatorOptions): ValidationResult<T>;
/**
 * Format validation errors for API error response (API Contracts: invalid_request, details).
 * Use in Fastify error handler or middleware to build the response body.
 */
export declare function formatErrorsForApi(errors: ValidationErrorItem[]): {
    code: 'invalid_request';
    message: string;
    details: {
        fields: Record<string, string[]>;
    };
};
//# sourceMappingURL=validate.d.ts.map