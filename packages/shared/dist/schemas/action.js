/**
 * JSON schemas for gateway action submission (agent action request).
 */
export const actionTypeEnum = [
    'read',
    'propose_change',
    'commit_change',
    'query',
    'execute_tool',
    'call_model',
];
export const submitActionSchema = {
    type: 'object',
    required: ['action_type', 'target_resource'],
    additionalProperties: false,
    properties: {
        action_type: {
            type: 'string',
            enum: actionTypeEnum,
        },
        target_resource: {
            type: 'string',
            minLength: 1,
        },
        context: {
            type: 'object',
            description: 'User prompt, task description, triggering event',
        },
        reasoning: { type: 'string' },
        request_payload: {
            type: 'object',
            description: 'Full request parameters for the action',
        },
    },
};
