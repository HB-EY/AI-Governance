/**
 * JSON schemas for policy create/update (WO-20).
 */

const ruleSchema = {
  type: 'object' as const,
  required: ['field', 'operator', 'value'],
  additionalProperties: false,
  properties: {
    field: { type: 'string' as const },
    operator: { type: 'string' as const, enum: ['equals', 'contains', 'matches', 'in', 'gt', 'lt'] },
    value: {},
    negate: { type: 'boolean' as const },
  },
};

export const createPolicySchema = {
  type: 'object' as const,
  required: ['name', 'description', 'rules', 'effect'],
  additionalProperties: false,
  properties: {
    name: { type: 'string' as const, minLength: 1, maxLength: 255 },
    description: { type: 'string' as const, minLength: 1 },
    rules: { type: 'array' as const, items: ruleSchema, minItems: 0 },
    effect: { type: 'string' as const, enum: ['allow', 'deny'] },
    priority: { type: 'number' as const },
    requires_validation: { type: 'boolean' as const },
    validation_types: { type: 'array' as const, items: { type: 'string' as const } },
    requires_approval: { type: 'boolean' as const },
    approver_roles: { type: 'array' as const, items: { type: 'string' as const } },
  },
};

export const updatePolicySchema = {
  type: 'object' as const,
  additionalProperties: false,
  properties: {
    description: { type: 'string' as const, minLength: 1 },
    rules: { type: 'array' as const, items: ruleSchema },
    effect: { type: 'string' as const, enum: ['allow', 'deny'] },
    priority: { type: 'number' as const },
    requires_validation: { type: 'boolean' as const },
    validation_types: { type: 'array' as const, items: { type: 'string' as const } },
    requires_approval: { type: 'boolean' as const },
    approver_roles: { type: 'array' as const, items: { type: 'string' as const } },
  },
  minProperties: 1,
};
