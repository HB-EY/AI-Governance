/**
 * Evidence / traces API calls (WO-25, WO-27).
 */

import { apiFetch } from './client';

export interface TraceSummary {
  id: string;
  run_id: string | null;
  agent_id: string;
  agent_version_id: string;
  action_type: string;
  target_resource: string;
  status: string;
  request_timestamp: string;
  completed_at: string | null;
  created_at: string;
}

export interface TraceDetail extends TraceSummary {
  context: Record<string, unknown> | null;
  reasoning: string | null;
  request_payload: Record<string, unknown> | null;
  evidence_key?: string;
  events?: unknown[];
}

export interface TracesListResponse {
  data: {
    items: TraceSummary[];
    pagination: { page: number; page_size: number; total: number; has_more: boolean };
  };
}

export interface TraceDetailResponse {
  data: TraceDetail;
}

export function getTraces(params: { page?: number; page_size?: number; agent_id?: string; status?: string; action_type?: string; from?: string; to?: string }) {
  const q = new URLSearchParams();
  if (params.page != null) q.set('page', String(params.page));
  if (params.page_size != null) q.set('page_size', String(params.page_size));
  if (params.agent_id) q.set('agent_id', params.agent_id);
  if (params.status) q.set('status', params.status);
  if (params.action_type) q.set('action_type', params.action_type);
  if (params.from) q.set('from', params.from);
  if (params.to) q.set('to', params.to);
  const query = q.toString();
  return apiFetch<TracesListResponse>(`/v1/evidence/traces${query ? `?${query}` : ''}`);
}

export function getTrace(id: string) {
  return apiFetch<TraceDetailResponse>(`/v1/evidence/traces/${id}`);
}

export interface ExportFilters {
  agent_id?: string;
  action_type?: string;
  status?: string;
  start_time?: string;
  end_time?: string;
  format?: 'json' | 'csv';
  include_full_payloads?: boolean;
}

export interface ExportStatusResponse {
  data: { export_id: string; status: string; download_url?: string; error_message?: string };
}

export function createEvidenceExport(body: ExportFilters) {
  return apiFetch<{ data: { export_id: string; status: string } }>('/v1/evidence/export', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function getExportStatus(exportId: string) {
  return apiFetch<ExportStatusResponse>(`/v1/evidence/exports/${exportId}`);
}
