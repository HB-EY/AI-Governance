/**
 * Validate policy rule structure: valid fields and operators (WO-20, WO-21).
 */
import type { PolicyRule } from '@ai-governance/shared';
export interface RuleValidationError {
    index: number;
    message: string;
}
export declare function validateRules(rules: PolicyRule[]): RuleValidationError[];
