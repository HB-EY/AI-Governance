/**
 * Validate policy rule structure: valid fields and operators (WO-20, WO-21).
 */

import type { PolicyRule } from '@ai-governance/shared';

const VALID_FIELDS = new Set([
  'agent.capabilities',
  'action.type',
  'resource.pattern',
  'time.hour',
  'time.day_of_week',
]);
const VALID_OPERATORS = new Set(['equals', 'contains', 'matches', 'in', 'gt', 'lt']);

export interface RuleValidationError {
  index: number;
  message: string;
}

export function validateRules(rules: PolicyRule[]): RuleValidationError[] {
  const errors: RuleValidationError[] = [];
  if (!Array.isArray(rules)) return [{ index: 0, message: 'Rules must be an array' }];
  rules.forEach((r, i) => {
    if (!r || typeof r !== 'object') {
      errors.push({ index: i, message: 'Rule must be an object' });
      return;
    }
    if (!VALID_FIELDS.has(r.field)) {
      errors.push({ index: i, message: `Invalid field: ${r.field}. Valid: ${[...VALID_FIELDS].join(', ')}` });
    }
    if (!VALID_OPERATORS.has(r.operator)) {
      errors.push({ index: i, message: `Invalid operator: ${r.operator}. Valid: ${[...VALID_OPERATORS].join(', ')}` });
    }
  });
  return errors;
}
