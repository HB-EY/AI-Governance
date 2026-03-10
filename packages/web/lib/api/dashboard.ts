/**
 * Dashboard metrics API (WO-43).
 */

import { apiFetch } from './client';

export interface DashboardMetrics {
  agents_by_status: { active: number; disabled: number; suspended: number };
  actions_24h: Record<string, number>;
  pending_approvals: number;
  recent_activity: Array<{
    id: string;
    agent_id: string;
    agent_name: string | null;
    action_type: string;
    status: string;
    request_timestamp: string;
  }>;
  recent_violations: Array<{
    id: string;
    agent_id: string;
    agent_name: string | null;
    action_type: string;
    status: string;
  }>;
}

export interface DashboardMetricsResponse {
  data: DashboardMetrics;
}

export function getDashboardMetrics() {
  return apiFetch<DashboardMetricsResponse>('/v1/dashboard/metrics');
}
