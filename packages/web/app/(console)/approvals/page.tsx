'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import type { ApprovalSummary } from '@/lib/api/approvals';
import { getApprovals } from '@/lib/api/approvals';

function timeRemaining(expiresAt: string): { text: string; urgent: boolean } {
  const exp = new Date(expiresAt).getTime();
  const now = Date.now();
  const sec = Math.max(0, Math.floor((exp - now) / 1000));
  if (sec <= 0) return { text: 'Expired', urgent: true };
  const min = Math.floor(sec / 60);
  const urgent = sec < 15 * 60;
  if (min < 60) return { text: `${min} min`, urgent };
  const h = Math.floor(min / 60);
  return { text: `${h}h ${min % 60}m`, urgent };
}

export default function ApprovalsPage() {
  const [items, setItems] = useState<ApprovalSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getApprovals({ status: 'pending', page: 1, page_size: 50 });
      setItems(res.data.items);
      setTotal(res.data.pagination.total);
    } catch (e) {
      console.error(e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const columns = [
    { key: 'id', header: 'Approval', render: (row: ApprovalSummary) => <Link href={`/approvals/${row.id}`} className="text-primary-600 hover:underline font-mono text-sm">{String(row.id).slice(0, 8)}…</Link> },
    { key: 'action_type', header: 'Action' },
    { key: 'action_summary', header: 'Summary', render: (row: ApprovalSummary) => String(row.action_summary).slice(0, 50) + (row.action_summary.length > 50 ? '…' : '') },
    { key: 'status', header: 'Status', render: (row: ApprovalSummary) => <StatusBadge status={row.status} /> },
    { key: 'expires_at', header: 'Time left', render: (row: ApprovalSummary) => {
      const { text, urgent } = timeRemaining(row.expires_at);
      return <span className={urgent ? 'text-red-600 font-medium' : ''}>{text}</span>;
    }},
    { key: 'created_at', header: 'Created', render: (row: ApprovalSummary) => new Date(row.created_at).toLocaleString() },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Approvals</h1>
      <p className="mt-2 text-slate-600">Review and decide on approval requests.</p>

      <div className="mt-4">
        <DataTable
          columns={columns as unknown as Column<Record<string, unknown>>[]}
          data={items as unknown as Record<string, unknown>[]}
          keyExtractor={(row) => String(row.id)}
          loading={loading}
          emptyMessage="No pending approvals."
        />
      </div>
      {total > 0 && (
        <p className="mt-2 text-sm text-slate-600">Total: {total}</p>
      )}
    </div>
  );
}
