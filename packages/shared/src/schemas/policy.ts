/**
 * JSON schemas for policy create/update.
 */

export const createPolicySchema = {
  type: 'object' as const,
  required: ['name', 'description'],
  additionalProperties: false,
  properties: {
    name: {
      type: 'string' as const,
      minLength: 1,
      maxLength: 255,
    },
    description: {
      type: 'string' as const,
      minLength: 1,
    },
  },
};

export const updatePolicySchema = {
  type: 'object' as const,
  additionalProperties: false,
  properties: {
    description: {
      type: 'string' as const,
      minLength: 1,
    },
  },
  minProperties: 1,
};
