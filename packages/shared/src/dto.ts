/**
 * Request/response DTOs for specific API endpoints.
 * Used for agent registration, policy CRUD, approval, validation, traces.
 */

import type { UUID } from './entities.js';
import type { CapabilityType } from './constants.js';

/** Request to register an agent (REQ-AREG-001) */
export interface RegisterAgentRequest {
  name: string;
  description?: string | null;
  owner_id: string;
  owner_email?: string | null;
  capabilities: CapabilityType[];
}

/** Response after successful agent registration (API key returned once only) */
export interface RegisterAgentResponse {
  agent_id: UUID;
  api_key: string;
}

/** Single rule condition for policy (WO-21: field, operator, value, negate) */
export interface PolicyRule {
  field: string;
  operator: 'equals' | 'contains' | 'matches' | 'in' | 'gt' | 'lt';
  value: unknown;
  negate?: boolean;
}

/** Request to create a policy (WO-20) */
export interface CreatePolicyRequest {
  name: string;
  description: string;
  rules: PolicyRule[];
  effect: 'allow' | 'deny';
  priority?: number;
  requires_validation?: boolean;
  validation_types?: string[];
  requires_approval?: boolean;
  approver_roles?: string[];
}

export interface UpdatePolicyRequest {
  description?: string;
  rules?: PolicyRule[];
  effect?: 'allow' | 'deny';
  priority?: number;
  requires_validation?: boolean;
  validation_types?: string[];
  requires_approval?: boolean;
  approver_roles?: string[];
}

/** Request to create/update a validation check */
export interface CreateValidationCheckRequest {
  name: string;
  check_type: string;
  description: string;
  configuration: Record<string, unknown>;
  timeout_seconds?: number;
}

export interface UpdateValidationCheckRequest {
  description?: string;
  configuration?: Record<string, unknown>;
  status?: 'active' | 'disabled';
  timeout_seconds?: number;
}

/** Approval decision from an approver */
export interface ApprovalDecisionRequest {
  approval_request_id: UUID;
  decision: 'approved' | 'denied';
  reason?: string | null;
}

/** Trace list filters (query params) */
export interface TraceListFilters {
  agent_id?: UUID;
  status?: string;
  action_type?: string;
  from?: string;
  to?: string;
}

/** Agent list filters */
export interface AgentListFilters {
  owner_id?: string;
  status?: string;
  name?: string;
}

/** Policy list filters */
export interface PolicyListFilters {
  status?: string;
  name?: string;
}
