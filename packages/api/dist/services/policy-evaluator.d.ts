/**
 * Policy evaluation engine (WO-21): rule matching, priority order, explicit deny precedence,
 * aggregation of validation and approval requirements.
 */
import type { PolicyVersion } from '@ai-governance/shared';
export interface EvaluationContext {
    agent_capabilities: string[];
    action_type: string;
    resource_pattern: string;
    time_hour?: number;
    time_day_of_week?: number;
}
export interface EvaluationResult {
    decision: 'allow' | 'deny' | 'allow-with-validation' | 'allow-with-approval';
    matched_policy_ids: string[];
    denial_reason?: string;
    validation_types: string[];
    approver_roles: string[];
}
export declare function evaluatePolicies(policies: Array<{
    policy_id: string;
    version: PolicyVersion;
}>, ctx: EvaluationContext): EvaluationResult;
