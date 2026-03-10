/**
 * Common JSON Schema fragments (definitions, formats).
 */
export const uuidSchema = {
    type: 'string',
    format: 'uuid',
    pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
};
export const capabilityTypeSchema = {
    type: 'array',
    items: {
        type: 'string',
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
    type: 'string',
    minLength: 1,
};
