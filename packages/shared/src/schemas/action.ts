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
] as const;

export const submitActionSchema = {
  type: 'object' as const,
  required: ['action_type', 'target_resource'],
  additionalProperties: false,
  properties: {
    action_type: {
      type: 'string' as const,
      enum: actionTypeEnum,
    },
    target_resource: {
      type: 'string' as const,
      minLength: 1,
    },
    context: {
      type: 'object' as const,
      description: 'User prompt, task description, triggering event',
    },
    reasoning: { type: 'string' as const },
    request_payload: {
      type: 'object' as const,
      description: 'Full request parameters for the action',
    },
  },
};
