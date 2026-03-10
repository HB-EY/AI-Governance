/**
 * JSON schemas for agent registration (REQ-AREG-001).
 */
import { capabilityTypeSchema } from './common.js';
export const registerAgentSchema = {
    type: 'object',
    required: ['name', 'owner_id', 'capabilities'],
    additionalProperties: false,
    properties: {
        name: {
            type: 'string',
            minLength: 1,
            maxLength: 255,
        },
        description: { type: 'string' },
        owner_id: {
            type: 'string',
            minLength: 1,
        },
        owner_email: { type: 'string' },
        capabilities: capabilityTypeSchema,
    },
};
