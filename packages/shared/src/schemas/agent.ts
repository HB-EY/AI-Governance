/**
 * JSON schemas for agent registration (REQ-AREG-001).
 */

import { capabilityTypeSchema } from './common.js';

export const registerAgentSchema = {
  type: 'object' as const,
  required: ['name', 'owner_id', 'capabilities'],
  additionalProperties: false,
  properties: {
    name: {
      type: 'string' as const,
      minLength: 1,
      maxLength: 255,
    },
    description: { type: 'string' as const },
    owner_id: {
      type: 'string' as const,
      minLength: 1,
    },
    owner_email: { type: 'string' as const },
    capabilities: capabilityTypeSchema,
  },
};
