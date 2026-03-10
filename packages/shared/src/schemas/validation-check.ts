/**
 * JSON schemas for validation check create/update.
 */

export const validationCheckTypeEnum = [
  'schema',
  'pii',
  'sentiment',
  'business-rule',
  'format',
] as const;

export const createValidationCheckSchema = {
  type: 'object' as const,
  required: ['name', 'check_type', 'description', 'configuration'],
  additionalProperties: false,
  properties: {
    name: {
      type: 'string' as const,
      minLength: 1,
      maxLength: 255,
    },
    check_type: {
      type: 'string' as const,
      enum: validationCheckTypeEnum,
    },
    description: {
      type: 'string' as const,
      minLength: 1,
    },
    configuration: {
      type: 'object' as const,
    },
    timeout_seconds: {
      type: 'integer' as const,
      minimum: 1,
      maximum: 300,
    },
  },
};

export const updateValidationCheckSchema = {
  type: 'object' as const,
  additionalProperties: false,
  properties: {
    description: {
      type: 'string' as const,
      minLength: 1,
    },
    configuration: {
      type: 'object' as const,
    },
    status: {
      type: 'string' as const,
      enum: ['active', 'disabled'],
    },
    timeout_seconds: {
      type: 'integer' as const,
      minimum: 1,
      maximum: 300,
    },
  },
  minProperties: 1,
};
