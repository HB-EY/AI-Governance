/**
 * JSON schema validation library.
 * Validates request bodies against schemas and returns structured errors
 * for API error responses (invalid_request, field-level details).
 */

import { Ajv, type ErrorObject, type AnySchemaObject } from 'ajv';
import addFormats from 'ajv-formats';

/** Single validation error for one field (AC-AREG-001.6: describe which fields are invalid) */
export interface ValidationErrorItem {
  path: string;
  message: string;
  schemaPath?: string;
  params?: Record<string, unknown>;
}

/** Result of validation: either success with data or failure with errors */
export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; errors: ValidationErrorItem[] };

/** Options for createValidator */
export interface ValidatorOptions {
  /** Remove additional properties not in schema (default true) */
  removeAdditional?: boolean;
  /** Use all errors from AJV instead of first (default true) */
  allErrors?: boolean;
}

const defaultOptions: Required<ValidatorOptions> = {
  removeAdditional: true,
  allErrors: true,
};

function makeAjv(options: ValidatorOptions) {
  const ajv = new Ajv({
    strict: true,
    allErrors: options.allErrors,
    removeAdditional: options.removeAdditional ? 'all' : false,
  });
  (addFormats as unknown as (ajv: Ajv) => void)(ajv);
  return ajv;
}

function toValidationErrors(errors: ErrorObject[] | null | undefined): ValidationErrorItem[] {
  if (!errors || errors.length === 0) return [];
  return errors.map((e) => ({
    path: e.instancePath ? e.instancePath.replace(/^\//, '').replace(/\//g, '.') : 'body',
    message: e.message ?? 'Validation failed',
    schemaPath: e.schemaPath,
    params: e.params as Record<string, unknown> | undefined,
  }));
}

/**
 * Create a validator function for a given JSON schema.
 * Returns a function that validates data and returns either { success, data } or { success, errors }.
 */
export function createValidator<T>(
  schema: AnySchemaObject,
  options: ValidatorOptions = {}
): (data: unknown) => ValidationResult<T> {
  const opts = { ...defaultOptions, ...options };
  const ajv = makeAjv(opts);
  const validate = ajv.compile(schema);

  return (data: unknown): ValidationResult<T> => {
    const ok = validate(data);
    if (ok) {
      return { success: true, data: data as T };
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
export function validate<T>(
  schema: AnySchemaObject,
  data: unknown,
  options: ValidatorOptions = {}
): ValidationResult<T> {
  const validator = createValidator<T>(schema, options);
  return validator(data);
}

/**
 * Format validation errors for API error response (API Contracts: invalid_request, details).
 * Use in Fastify error handler or middleware to build the response body.
 */
export function formatErrorsForApi(errors: ValidationErrorItem[]): {
  code: 'invalid_request';
  message: string;
  details: { fields: Record<string, string[]> };
} {
  const fields: Record<string, string[]> = {};
  for (const e of errors) {
    const key = e.path || 'body';
    if (!fields[key]) fields[key] = [];
    fields[key].push(e.message);
  }
  const first = errors[0];
  const message =
    errors.length === 1
      ? first?.message ?? 'Validation failed'
      : `${errors.length} validation error(s)`;
  return {
    code: 'invalid_request',
    message,
    details: { fields },
  };
}
