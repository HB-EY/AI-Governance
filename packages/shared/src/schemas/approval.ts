/**
 * JSON schemas for approval decision requests.
 */

import { uuidSchema } from './common.js';

export const approvalDecisionSchema = {
  type: 'object' as const,
  required: ['approval_request_id', 'decision'],
  additionalProperties: false,
  properties: {
    approval_request_id: uuidSchema,
    decision: {
      type: 'string' as const,
      enum: ['approved', 'denied'],
    },
    reason: { type: 'string' as const },
  },
};
