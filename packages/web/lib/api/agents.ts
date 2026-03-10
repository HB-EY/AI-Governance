/**
 * Agent API calls (WO-17, WO-18).
 */

import { apiFetch } from './client';

export interface AgentSummary {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  owner_email: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  last_active_at: string | null;
}

export interface AgentDetail extends AgentSummary {
  recent_actions_count_30d?: number;
  recent_violations_count_30d?: number;
}

export interface AgentsResponse {
  data: {
    items: AgentSummary[];
    pagination: { page: number; page_size: number; total: number; has_more: boolean };
  };
}

export interface AgentDetailResponse {
  data: AgentDetail;
}

export interface RegisterAgentBody {
  name: string;
  description?: string;
  owner_id: string;
  owner_email?: string;
  capabilities: string[];
}

export interface RegisterAgentResponse {
  data: { agent_id: string; api_key: string };
}

export function getAgents(params: { page?: number; page_size?: number; status?: string; owner?: string; name?: string }) {
  const q = new URLSearchParams();
  if (params.page != null) q.set('page', String(params.page));
  if (params.page_size != null) q.set('page_size', String(params.page_size));
  if (params.status) q.set('status', params.status);
  if (params.owner) q.set('owner', params.owner);
  if (params.name) q.set('name', params.name);
  const query = q.toString();
  return apiFetch<AgentsResponse>(`/v1/agents${query ? `?${query}` : ''}`);
}

export function getAgent(id: string) {
  return apiFetch<AgentDetailResponse>(`/v1/agents/${id}`);
}

export function registerAgent(body: RegisterAgentBody) {
  return apiFetch<RegisterAgentResponse>('/v1/agents', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function patchAgent(id: string, body: { description?: string; owner_id?: string; owner_email?: string | null; capabilities?: string[] }) {
  return apiFetch<{ data: AgentSummary }>(`/v1/agents/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function disableAgent(id: string, reason?: string) {
  return apiFetch<{ data: AgentSummary }>(`/v1/agents/${id}/disable`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function enableAgent(id: string, note?: string) {
  return apiFetch<{ data: AgentSummary }>(`/v1/agents/${id}/enable`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  });
}
