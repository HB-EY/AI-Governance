/**
 * Validation checks API (WO-29, WO-44).
 */

import { apiFetch } from './client';

export interface ValidationCheckSummary {
  id: string;
  name: string;
  check_type: string;
  description: string;
  status: string;
  timeout_seconds: number;
  created_at: string;
}

export interface ValidationChecksListResponse {
  data: { items: ValidationCheckSummary[] };
}

export interface ValidationCheckDetailResponse {
  data: ValidationCheckSummary & { configuration: Record<string, unknown> };
}

export interface CreateValidationCheckBody {
  name: string;
  check_type: string;
  description: string;
  configuration: Record<string, unknown>;
  timeout_seconds?: number;
}

export function getValidationChecks(params?: { check_type?: string; status?: string }) {
  const q = new URLSearchParams();
  if (params?.check_type) q.set('check_type', params.check_type);
  if (params?.status) q.set('status', params.status);
  const query = q.toString();
  return apiFetch<ValidationChecksListResponse>(`/v1/validation-checks${query ? `?${query}` : ''}`);
}

export function getValidationCheck(id: string) {
  return apiFetch<ValidationCheckDetailResponse>(`/v1/validation-checks/${id}`);
}

export function createValidationCheck(body: CreateValidationCheckBody) {
  return apiFetch<{ data: ValidationCheckSummary }>('/v1/validation-checks', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateValidationCheck(id: string, body: { description?: string; configuration?: Record<string, unknown>; status?: string; timeout_seconds?: number }) {
  return apiFetch<{ data: ValidationCheckSummary }>(`/v1/validation-checks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}
