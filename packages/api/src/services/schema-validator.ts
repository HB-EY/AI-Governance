/**
 * Schema validation check (WO-30): validate payload against JSON schema.
 * Use createRequire so ajv works when the package is ESM or CJS.
 */

import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const Ajv = (require('ajv') as { default?: new (opts?: { allErrors?: boolean }) => unknown }).default ?? require('ajv');

let ajvInstance: InstanceType<typeof Ajv> | null = null;

function getAjv(): InstanceType<typeof Ajv> {
  if (!ajvInstance) ajvInstance = new Ajv({ allErrors: true });
  return ajvInstance;
}

export interface SchemaCheckResult {
  pass: boolean;
  errors?: Array<{ path: string; message: string }>;
}

export function validateAgainstSchema(
  schema: Record<string, unknown>,
  payload: unknown
): SchemaCheckResult {
  try {
    const validator = getAjv().compile(schema) as ((data: unknown) => boolean) & { errors?: Array<{ instancePath?: string; params?: { missingProperty?: string }; message?: string }> };
    const valid = validator(payload);
    if (valid) return { pass: true };
    const errList = validator.errors ?? [];
    const errors = errList.map((e: { instancePath?: string; params?: { missingProperty?: string }; message?: string }) => ({
      path: e.instancePath || (e.params && 'missingProperty' in e.params ? e.params.missingProperty : '') || '',
      message: e.message ?? 'validation error',
    }));
    return { pass: false, errors };
  } catch (err) {
    return {
      pass: false,
      errors: [{ path: '', message: err instanceof Error ? err.message : 'Invalid schema' }],
    };
  }
}
