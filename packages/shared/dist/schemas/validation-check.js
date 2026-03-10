/**
 * JSON schemas for validation check create/update.
 */
export const validationCheckTypeEnum = [
    'schema',
    'pii',
    'sentiment',
    'business-rule',
    'format',
];
export const createValidationCheckSchema = {
    type: 'object',
    required: ['name', 'check_type', 'description', 'configuration'],
    additionalProperties: false,
    properties: {
        name: {
            type: 'string',
            minLength: 1,
            maxLength: 255,
        },
        check_type: {
            type: 'string',
            enum: validationCheckTypeEnum,
        },
        description: {
            type: 'string',
            minLength: 1,
        },
        configuration: {
            type: 'object',
        },
        timeout_seconds: {
            type: 'integer',
            minimum: 1,
            maximum: 300,
        },
    },
};
export const updateValidationCheckSchema = {
    type: 'object',
    additionalProperties: false,
    properties: {
        description: {
            type: 'string',
            minLength: 1,
        },
        configuration: {
            type: 'object',
        },
        status: {
            type: 'string',
            enum: ['active', 'disabled'],
        },
        timeout_seconds: {
            type: 'integer',
            minimum: 1,
            maximum: 300,
        },
    },
    minProperties: 1,
};
