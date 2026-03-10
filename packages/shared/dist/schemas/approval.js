/**
 * JSON schemas for approval decision requests.
 */
import { uuidSchema } from './common.js';
export const approvalDecisionSchema = {
    type: 'object',
    required: ['approval_request_id', 'decision'],
    additionalProperties: false,
    properties: {
        approval_request_id: uuidSchema,
        decision: {
            type: 'string',
            enum: ['approved', 'denied'],
        },
        reason: { type: 'string' },
    },
};
