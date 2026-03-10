/**
 * JSON schemas for policy create/update (WO-20).
 */
const ruleSchema = {
    type: 'object',
    required: ['field', 'operator', 'value'],
    additionalProperties: false,
    properties: {
        field: { type: 'string' },
        operator: { type: 'string', enum: ['equals', 'contains', 'matches', 'in', 'gt', 'lt'] },
        value: {},
        negate: { type: 'boolean' },
    },
};
export const createPolicySchema = {
    type: 'object',
    required: ['name', 'description', 'rules', 'effect'],
    additionalProperties: false,
    properties: {
        name: { type: 'string', minLength: 1, maxLength: 255 },
        description: { type: 'string', minLength: 1 },
        rules: { type: 'array', items: ruleSchema, minItems: 0 },
        effect: { type: 'string', enum: ['allow', 'deny'] },
        priority: { type: 'number' },
        requires_validation: { type: 'boolean' },
        validation_types: { type: 'array', items: { type: 'string' } },
        requires_approval: { type: 'boolean' },
        approver_roles: { type: 'array', items: { type: 'string' } },
    },
};
export const updatePolicySchema = {
    type: 'object',
    additionalProperties: false,
    properties: {
        description: { type: 'string', minLength: 1 },
        rules: { type: 'array', items: ruleSchema },
        effect: { type: 'string', enum: ['allow', 'deny'] },
        priority: { type: 'number' },
        requires_validation: { type: 'boolean' },
        validation_types: { type: 'array', items: { type: 'string' } },
        requires_approval: { type: 'boolean' },
        approver_roles: { type: 'array', items: { type: 'string' } },
    },
    minProperties: 1,
};
