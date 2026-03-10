/**
 * Policy API calls (WO-20, WO-22).
 */

import { apiFetch } from './client';

export interface PolicyRule {
  field: string;
  operator: string;
  value: unknown;
  negate?: boolean;
}

export interface PolicyVersion {
  id: string;
  policy_id: string;
  version_number: number;
  status: string;
  rules: PolicyRule[];
  effect: string;
  priority: number;
  requires_validation: boolean;
  validation_types: string[];
  requires_approval: boolean;
  approver_roles: string[];
  change_reason: string | null;
  created_at: string;
  created_by: string | null;
}

export interface PolicySummary {
  id: string;
  name: string;
  description: string;
  current_version_id: string | null;
  status?: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface PolicyDetail extends PolicySummary {
  version?: PolicyVersion | null;
}

export interface PoliciesListResponse {
  data: {
    items: PolicySummary[];
    pagination: { page: number; page_size: number; total: number; has_more: boolean };
  };
}

export interface PolicyDetailResponse {
  data: PolicyDetail;
}

export interface CreatePolicyBody {
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

export function getPolicies(params: { page?: number; page_size?: number; status?: string; name?: string }) {
  const q = new URLSearchParams();
  if (params.page != null) q.set('page', String(params.page));
  if (params.page_size != null) q.set('page_size', String(params.page_size));
  if (params.status) q.set('status', params.status);
  if (params.name) q.set('name', params.name);
  const query = q.toString();
  return apiFetch<PoliciesListResponse>(`/v1/policies${query ? `?${query}` : ''}`);
}

export function getPolicy(id: string) {
  return apiFetch<PolicyDetailResponse>(`/v1/policies/${id}`);
}

export function createPolicy(body: CreatePolicyBody) {
  return apiFetch<{ data: PolicyDetail }>('/v1/policies', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updatePolicy(id: string, body: { description?: string; rules?: PolicyRule[]; effect?: 'allow' | 'deny'; priority?: number; requires_validation?: boolean; validation_types?: string[]; requires_approval?: boolean; approver_roles?: string[] }) {
  return apiFetch<{ data: PolicyDetail }>(`/v1/policies/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function disablePolicy(id: string, reason?: string) {
  return apiFetch<{ data: PolicyDetail }>(`/v1/policies/${id}/disable`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function enablePolicy(id: string, note?: string) {
  return apiFetch<{ data: PolicyDetail }>(`/v1/policies/${id}/enable`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  });
}

export function evaluatePolicy(body: { agent_id?: string; agent_capabilities?: string[]; action_type: string; target_resource: string }) {
  return apiFetch<{ data: { decision: string; matched_policy_ids: string[]; denial_reason?: string; validation_types: string[]; approver_roles: string[]; evaluation_time_ms: number } }>('/v1/policies/evaluate', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
