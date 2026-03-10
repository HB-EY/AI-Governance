/**
 * Common JSON Schema fragments (definitions, formats).
 */

export const uuidSchema = {
  type: 'string' as const,
  format: 'uuid',
  pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
};

export const capabilityTypeSchema = {
  type: 'array' as const,
  items: {
    type: 'string' as const,
    enum: [
      'read',
      'propose_change',
      'commit_change',
      'query',
      'execute_tool',
      'call_model',
    ],
  },
  minItems: 1,
};

export const nonEmptyString = {
  type: 'string' as const,
  minLength: 1,
};
