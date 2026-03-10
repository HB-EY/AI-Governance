/**
 * JSON schemas for evidence creation (attachments, payloads linked to traces).
 */

export const createEvidenceSchema = {
  type: 'object' as const,
  required: ['trace_id', 'content_type'],
  additionalProperties: false,
  properties: {
    trace_id: {
      type: 'string' as const,
      format: 'uuid',
    },
    content_type: {
      type: 'string' as const,
      minLength: 1,
    },
    payload: {
      description: 'Evidence payload (object or base64-encoded string for binary)',
    },
    metadata: {
      type: 'object' as const,
    },
  },
};
