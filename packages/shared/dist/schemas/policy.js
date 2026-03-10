/**
 * JSON schemas for policy create/update.
 */
export const createPolicySchema = {
    type: 'object',
    required: ['name', 'description'],
    additionalProperties: false,
    properties: {
        name: {
            type: 'string',
            minLength: 1,
            maxLength: 255,
        },
        description: {
            type: 'string',
            minLength: 1,
        },
    },
};
export const updatePolicySchema = {
    type: 'object',
    additionalProperties: false,
    properties: {
        description: {
            type: 'string',
            minLength: 1,
        },
    },
    minProperties: 1,
};
