'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { FilterPanel } from '@/components/ui/FilterPanel';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import type { AgentSummary } from '@/lib/api/agents';
import { getAgents } from '@/lib/api/agents';

const CAPABILITIES = ['read', 'propose_change', 'commit_change', 'query', 'execute_tool', 'call_model'];

export default function AgentsPage() {
  const [items, setItems] = useState<AgentSummary[]>([]);
  const [pagination, setPagination] = useState({ page: 1, page_size: 10, total: 0, has_more: false });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Record<string, string>>({ status: '', owner: '', name: '' });

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await getAgents({
        page,
        page_size: 10,
        status: filters.status || undefined,
        owner: filters.owner || undefined,
        name: filters.name || undefined,
      });
      setItems(res.data.items);
      setPagination(res.data.pagination);
    } catch (e) {
      console.error(e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [filters.status, filters.owner, filters.name]);

  useEffect(() => {
    load(pagination.page);
  }, [load, pagination.page]);

  const columns = [
    { key: 'name', header: 'Name', render: (row: AgentSummary) => <Link href={`/agents/${row.id}`} className="text-primary-600 hover:underline font-medium">{row.name}</Link> },
    { key: 'owner_id', header: 'Owner' },
    { key: 'status', header: 'Status', render: (row: AgentSummary) => <StatusBadge status={row.status} /> },
    { key: 'last_active_at', header: 'Last active', render: (row: AgentSummary) => row.last_active_at ? new Date(row.last_active_at).toLocaleString() : '—' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Agents</h1>
        <Link href="/agents/new">
          <Button>Register agent</Button>
        </Link>
      </div>
      <p className="mt-2 text-slate-600">Browse and manage registered agents.</p>

      <FilterPanel
        fields={[
          { name: 'status', label: 'Status', type: 'select', options: [{ value: 'active', label: 'Active' }, { value: 'disabled', label: 'Disabled' }, { value: 'suspended', label: 'Suspended' }] },
          { name: 'owner', label: 'Owner', type: 'text', placeholder: 'Filter by owner' },
          { name: 'name', label: 'Search by name', type: 'text', placeholder: 'Agent name' },
        ]}
        values={filters}
        onChange={(name, value) => setFilters((f) => ({ ...f, [name]: value }))}
        onApply={() => load(1)}
        onReset={() => setFilters({ status: '', owner: '', name: '' })}
      />

      <div className="mt-4">
        <DataTable
          columns={columns as Column<Record<string, unknown>>[]}
          data={items as unknown as Record<string, unknown>[]}
          keyExtractor={(row) => String(row.id)}
          loading={loading}
          emptyMessage="No agents found."
        />
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
        <span>Page {pagination.page} · Total {pagination.total}</span>
        <div className="gap-2 flex">
          <Button variant="secondary" disabled={pagination.page <= 1} onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}>Previous</Button>
          <Button variant="secondary" disabled={!pagination.has_more} onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}>Next</Button>
        </div>
      </div>
    </div>
  );
}
