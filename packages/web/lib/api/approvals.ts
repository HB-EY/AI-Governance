/**
 * Approval API calls (WO-34, 35, 36).
 */

import { apiFetch } from './client';

export interface ApprovalSummary {
  id: string;
  trace_id: string;
  agent_id: string;
  action_type: string;
  action_summary: string;
  status: string;
  approver_roles: string[];
  assigned_approvers: string[];
  expires_at: string;
  created_at: string;
}

export interface ApprovalDetail extends ApprovalSummary {
  agent_name?: string;
  evidence_summary?: Record<string, unknown>;
  time_remaining_seconds?: number;
}

export interface ApprovalsListResponse {
  data: { items: ApprovalSummary[]; pagination: { page: number; page_size: number; total: number } };
}

export interface ApprovalDetailResponse {
  data: ApprovalDetail;
}

export function getApprovals(params: { status?: string; approver_id?: string; approver_role?: string; page?: number; page_size?: number }) {
  const q = new URLSearchParams();
  if (params.status) q.set('status', params.status);
  if (params.approver_id) q.set('approver_id', params.approver_id);
  if (params.approver_role) q.set('approver_role', params.approver_role);
  if (params.page != null) q.set('page', String(params.page));
  if (params.page_size != null) q.set('page_size', String(params.page_size));
  const query = q.toString();
  return apiFetch<ApprovalsListResponse>(`/v1/approvals${query ? `?${query}` : ''}`);
}

export function getApproval(id: string) {
  return apiFetch<ApprovalDetailResponse>(`/v1/approvals/${id}`);
}

export function approveApproval(id: string, reason?: string) {
  return apiFetch<{ data: ApprovalSummary }>(`/v1/approvals/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function denyApproval(id: string, reason: string) {
  return apiFetch<{ data: ApprovalSummary }>(`/v1/approvals/${id}/deny`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}
