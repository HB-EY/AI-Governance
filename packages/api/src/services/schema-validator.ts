/**
 * Schema validation check (WO-30): validate payload against JSON schema.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Ajv = require('ajv').default as new (opts?: { allErrors?: boolean }) => {
  compile: (schema: Record<string, unknown>) => ((data: unknown) => boolean) & { errors?: Array<{ instancePath?: string; params?: { missingProperty?: string }; message?: string }> };
};

let ajv: InstanceType<typeof Ajv> | null = null;

function getAjv(): InstanceType<typeof Ajv> {
  if (!ajv) ajv = new Ajv({ allErrors: true });
  return ajv;
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
