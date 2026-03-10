'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { FilterPanel } from '@/components/ui/FilterPanel';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import type { PolicySummary } from '@/lib/api/policies';
import { getPolicies } from '@/lib/api/policies';

export default function PoliciesPage() {
  const [items, setItems] = useState<PolicySummary[]>([]);
  const [pagination, setPagination] = useState({ page: 1, page_size: 10, total: 0, has_more: false });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Record<string, string>>({ status: '', name: '' });

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await getPolicies({
        page,
        page_size: 10,
        status: filters.status || undefined,
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
  }, [filters.status, filters.name]);

  useEffect(() => {
    load(pagination.page);
  }, [load, pagination.page]);

  const columns = [
    { key: 'name', header: 'Name', render: (row: PolicySummary) => <Link href={`/policies/${row.id}`} className="text-primary-600 hover:underline font-medium">{row.name}</Link> },
    { key: 'description', header: 'Description', render: (row: PolicySummary) => (row.description ? String(row.description).slice(0, 60) + (row.description.length > 60 ? '…' : '') : '—') },
    { key: 'status', header: 'Status', render: (row: PolicySummary) => <StatusBadge status={row.status ?? '—'} /> },
    { key: 'updated_at', header: 'Updated', render: (row: PolicySummary) => row.updated_at ? new Date(row.updated_at).toLocaleString() : '—' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Policies</h1>
        <Link href="/policies/new">
          <Button>Create policy</Button>
        </Link>
      </div>
      <p className="mt-2 text-slate-600">Create and manage governance policies.</p>

      <FilterPanel
        fields={[
          { name: 'status', label: 'Status', type: 'select', options: [{ value: 'active', label: 'Active' }, { value: 'disabled', label: 'Disabled' }] },
          { name: 'name', label: 'Search by name', type: 'text', placeholder: 'Policy name' },
        ]}
        values={filters}
        onChange={(name, value) => setFilters((f) => ({ ...f, [name]: value }))}
        onApply={() => load(1)}
        onReset={() => setFilters({ status: '', name: '' })}
      />

      <div className="mt-4">
        <DataTable
          columns={columns as unknown as Column<Record<string, unknown>>[]}
          data={items as unknown as Record<string, unknown>[]}
          keyExtractor={(row) => String(row.id)}
          loading={loading}
          emptyMessage="No policies found."
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
