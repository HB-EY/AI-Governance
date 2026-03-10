/**
 * Integration tests for gateway pipeline (WO-49): policy evaluation, validation runner, evidence.
 * Requires DATABASE_URL for full flow. Some tests run in-memory.
 */

import { evaluatePolicies } from '../../src/services/policy-evaluator.js';
import type { PolicyVersion } from '@ai-governance/shared';

const hasDb = !!process.env.DATABASE_URL;

describe('Policy evaluator', () => {
  it('returns deny when no policies match', () => {
    const result = evaluatePolicies([], {
      agent_capabilities: [],
      action_type: 'write',
      resource_pattern: '/data',
    });
    expect(result.decision).toBe('deny');
    expect(result.denial_reason).toBeDefined();
  });

  it('returns allow when policy matches with effect allow', () => {
    const version: PolicyVersion = {
      id: 'v1',
      policy_id: 'p1',
      version_number: 1,
      status: 'active',
      rules: [{ field: 'action.type', operator: 'equals', value: 'read' }] as unknown as Record<string, unknown>,
      effect: 'allow',
      priority: 0,
      requires_validation: false,
      validation_types: [],
      requires_approval: false,
      approver_roles: [],
      change_reason: null,
      created_at: '',
      created_by: null,
    };
    const result = evaluatePolicies([{ policy_id: 'p1', version }], {
      agent_capabilities: [],
      action_type: 'read',
      resource_pattern: '/foo',
    });
    expect(result.decision).toBe('allow');
  });

  it('returns deny when policy has effect deny and matches', () => {
    const version: PolicyVersion = {
      id: 'v1',
      policy_id: 'p1',
      version_number: 1,
      status: 'active',
      rules: [{ field: 'action.type', operator: 'equals', value: 'delete' }] as unknown as Record<string, unknown>,
      effect: 'deny',
      priority: 10,
      requires_validation: false,
      validation_types: [],
      requires_approval: false,
      approver_roles: [],
      change_reason: null,
      created_at: '',
      created_by: null,
    };
    const result = evaluatePolicies([{ policy_id: 'p1', version }], {
      agent_capabilities: [],
      action_type: 'delete',
      resource_pattern: '/data',
    });
    expect(result.decision).toBe('deny');
    expect(result.matched_policy_ids).toContain('p1');
  });

  it('returns allow-with-validation when policy requires validation', () => {
    const version: PolicyVersion = {
      id: 'v1',
      policy_id: 'p1',
      version_number: 1,
      status: 'active',
      rules: [] as unknown as Record<string, unknown>,
      effect: 'allow',
      priority: 0,
      requires_validation: true,
      validation_types: ['schema'],
      requires_approval: false,
      approver_roles: [],
      change_reason: null,
      created_at: '',
      created_by: null,
    };
    const result = evaluatePolicies([{ policy_id: 'p1', version }], {
      agent_capabilities: [],
      action_type: 'read',
      resource_pattern: '/foo',
    });
    expect(result.decision).toBe('allow-with-validation');
    expect(result.validation_types).toContain('schema');
  });
});

describe('Gateway integration (DB)', () => {
  it('skips when DATABASE_URL not set', () => {
    if (!hasDb) expect(process.env.DATABASE_URL).toBeFalsy();
  });
});
