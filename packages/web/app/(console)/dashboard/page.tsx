'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { DashboardMetrics } from '@/lib/api/dashboard';
import { getDashboardMetrics } from '@/lib/api/dashboard';

const REFRESH_MS = 30_000;

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await getDashboardMetrics();
      setMetrics(res.data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load metrics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  if (loading && !metrics) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse rounded-lg border border-slate-200 bg-slate-100 h-24" />
          ))}
        </div>
      </div>
    );
  }

  if (error && !metrics) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="mt-2 text-red-600">{error}</p>
      </div>
    );
  }

  const m = metrics!;
  const agents = m.agents_by_status ?? { active: 0, disabled: 0, suspended: 0 };
  const actions = m.actions_24h ?? {};
  const pending = m.pending_approvals ?? 0;
  const recent = m.recent_activity ?? [];
  const violations = m.recent_violations ?? [];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
      <p className="mt-2 text-slate-600">
        Overview of agent activity, system health, and counts. Auto-refreshes every 30s.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Active agents</p>
          <p className="mt-1 text-2xl font-semibold">{agents.active ?? 0}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Disabled agents</p>
          <p className="mt-1 text-2xl font-semibold">{agents.disabled ?? 0}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Suspended agents</p>
          <p className="mt-1 text-2xl font-semibold">{agents.suspended ?? 0}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Pending approvals</p>
          <p className="mt-1 text-2xl font-semibold">{pending}</p>
          {pending > 0 && (
            <Link href="/approvals" className="mt-2 block text-sm font-medium text-ey-charcoal hover:text-ey-yellow transition-colors">View queue</Link>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-medium text-slate-900">Actions (past 24h)</h2>
          <div className="mt-3 flex flex-wrap gap-4">
            <span className="text-sm">Success: <strong>{actions.success ?? 0}</strong></span>
            <span className="text-sm">Denied: <strong>{actions.denied ?? 0}</strong></span>
            <span className="text-sm">Failed: <strong>{actions.failed ?? 0}</strong></span>
            <span className="text-sm">Pending: <strong>{actions.pending ?? 0}</strong></span>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-medium text-slate-900">Recent violations (denied)</h2>
          <ul className="mt-3 space-y-2">
            {violations.length === 0 ? (
              <li className="text-sm text-slate-500">None</li>
            ) : (
              violations.map((v) => (
                <li key={v.id} className="text-sm">
                  <Link href={`/traces/${v.id}`} className="text-ey-charcoal font-medium hover:text-ey-yellow transition-colors">{v.agent_name ?? v.agent_id}</Link>
                  {' — '}{v.action_type}
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-medium text-slate-900">Recent activity</h2>
        <div className="mt-3 overflow-x-auto">
          {recent.length === 0 ? (
            <p className="text-sm text-slate-500">No recent actions</p>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="pb-2 pr-4">Agent</th>
                  <th className="pb-2 pr-4">Action</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2">Time</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100">
                    <td className="py-2 pr-4">
                      <Link href={`/traces/${r.id}`} className="text-ey-charcoal font-medium hover:text-ey-yellow transition-colors">
                        {r.agent_name ?? r.agent_id}
                      </Link>
                    </td>
                    <td className="py-2 pr-4">{r.action_type}</td>
                    <td className="py-2 pr-4"><StatusBadge status={r.status} /></td>
                    <td className="py-2">{r.request_timestamp ? new Date(r.request_timestamp).toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
