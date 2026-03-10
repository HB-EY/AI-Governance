/**
 * JSON schemas for evidence creation (attachments, payloads linked to traces).
 */
export const createEvidenceSchema = {
    type: 'object',
    required: ['trace_id', 'content_type'],
    additionalProperties: false,
    properties: {
        trace_id: {
            type: 'string',
            format: 'uuid',
        },
        content_type: {
            type: 'string',
            minLength: 1,
        },
        payload: {
            description: 'Evidence payload (object or base64-encoded string for binary)',
        },
        metadata: {
            type: 'object',
        },
    },
};
