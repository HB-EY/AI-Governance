/**
 * Policy evaluation engine (WO-21): rule matching, priority order, explicit deny precedence,
 * aggregation of validation and approval requirements.
 */

import type { PolicyVersion } from '@ai-governance/shared';
import type { PolicyRule } from '@ai-governance/shared';

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

function getContextValue(ctx: EvaluationContext, field: string): unknown {
  switch (field) {
    case 'agent.capabilities':
      return ctx.agent_capabilities;
    case 'action.type':
      return ctx.action_type;
    case 'resource.pattern':
      return ctx.resource_pattern;
    case 'time.hour':
      return ctx.time_hour;
    case 'time.day_of_week':
      return ctx.time_day_of_week;
    default:
      return undefined;
  }
}

function evaluateOperator(
  actual: unknown,
  operator: string,
  expected: unknown
): boolean {
  if (actual === undefined || actual === null) return false;

  switch (operator) {
    case 'equals':
      return actual === expected;
    case 'contains': {
      if (Array.isArray(actual)) return actual.includes(expected);
      if (typeof actual === 'string' && typeof expected === 'string') return actual.includes(expected);
      return false;
    }
    case 'matches': {
      if (typeof actual !== 'string' || typeof expected !== 'string') return false;
      try {
        return new RegExp(expected).test(actual);
      } catch {
        return false;
      }
    }
    case 'in': {
      if (Array.isArray(expected)) return expected.includes(actual);
      return actual === expected;
    }
    case 'gt': {
      const a = Number(actual);
      const b = Number(expected);
      return !Number.isNaN(a) && !Number.isNaN(b) && a > b;
    }
    case 'lt': {
      const a = Number(actual);
      const b = Number(expected);
      return !Number.isNaN(a) && !Number.isNaN(b) && a < b;
    }
    default:
      return false;
  }
}

function ruleMatches(rule: PolicyRule, ctx: EvaluationContext): boolean {
  const actual = getContextValue(ctx, rule.field);
  let result = evaluateOperator(actual, rule.operator, rule.value);
  if (rule.negate) result = !result;
  return result;
}

function policyMatches(policy: PolicyVersion, ctx: EvaluationContext): boolean {
  const rules = Array.isArray(policy.rules) ? policy.rules as PolicyRule[] : [];
  if (rules.length === 0) return true;
  return rules.every((r) => ruleMatches(r, ctx));
}

export function evaluatePolicies(
  policies: Array<{ policy_id: string; version: PolicyVersion }>,
  ctx: EvaluationContext
): EvaluationResult {
  const validationTypes: string[] = [];
  const approverRoles: string[] = [];
  const matchedIds: string[] = [];

  for (const { policy_id, version } of policies) {
    if (version.status !== 'active') continue;
    if (!policyMatches(version, ctx)) continue;

    matchedIds.push(policy_id);
    if (version.effect === 'deny') {
      return {
        decision: 'deny',
        matched_policy_ids: matchedIds,
        denial_reason: `Denied by policy ${policy_id}`,
        validation_types: [],
        approver_roles: [],
      };
    }
    if (version.requires_validation && version.validation_types?.length) {
      version.validation_types.forEach((t) => {
        if (!validationTypes.includes(t)) validationTypes.push(t);
      });
    }
    if (version.requires_approval && version.approver_roles?.length) {
      version.approver_roles.forEach((r) => {
        if (!approverRoles.includes(r)) approverRoles.push(r);
      });
    }
  }

  if (matchedIds.length === 0) {
    return {
      decision: 'deny',
      matched_policy_ids: [],
      denial_reason: 'No matching policy',
      validation_types: [],
      approver_roles: [],
    };
  }

  if (approverRoles.length > 0) {
    return {
      decision: 'allow-with-approval',
      matched_policy_ids: matchedIds,
      validation_types: validationTypes,
      approver_roles: approverRoles,
    };
  }
  if (validationTypes.length > 0) {
    return {
      decision: 'allow-with-validation',
      matched_policy_ids: matchedIds,
      validation_types: validationTypes,
      approver_roles: [],
    };
  }
  return {
    decision: 'allow',
    matched_policy_ids: matchedIds,
    validation_types: [],
    approver_roles: [],
  };
}
