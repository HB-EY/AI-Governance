'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { FilterPanel } from '@/components/ui/FilterPanel';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import type { ValidationCheckSummary } from '@/lib/api/validation-checks';
import { getValidationChecks } from '@/lib/api/validation-checks';

const CHECK_TYPES = ['schema', 'pii', 'sentiment', 'business-rule', 'format'];

export default function ValidationChecksPage() {
  const [items, setItems] = useState<ValidationCheckSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Record<string, string>>({ check_type: '', status: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getValidationChecks({
        check_type: filters.check_type || undefined,
        status: filters.status || undefined,
      });
      setItems(res.data.items);
    } catch (e) {
      console.error(e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [filters.check_type, filters.status]);

  useEffect(() => {
    load();
  }, [load]);

  const columns = [
    { key: 'name', header: 'Name', render: (row: ValidationCheckSummary) => <Link href={`/validation/checks/${row.id}`} className="text-primary-600 hover:underline font-medium">{row.name}</Link> },
    { key: 'check_type', header: 'Type' },
    { key: 'description', header: 'Description', render: (row: ValidationCheckSummary) => String(row.description).slice(0, 50) + (row.description.length > 50 ? '…' : '') },
    { key: 'status', header: 'Status', render: (row: ValidationCheckSummary) => <StatusBadge status={row.status} /> },
    { key: 'timeout_seconds', header: 'Timeout (s)' },
    { key: 'created_at', header: 'Created', render: (row: ValidationCheckSummary) => new Date(row.created_at).toLocaleString() },
  ];

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Validation checks</h1>
        <Link href="/validation/checks/new">
          <Button>Create check</Button>
        </Link>
      </div>
      <p className="mt-2 text-slate-600">Configure validation checks (schema, PII, sentiment, business-rule).</p>

      <FilterPanel
        fields={[
          { name: 'check_type', label: 'Type', type: 'select', options: [{ value: '', label: 'All' }, ...CHECK_TYPES.map((t) => ({ value: t, label: t }))] },
          { name: 'status', label: 'Status', type: 'select', options: [{ value: '', label: 'All' }, { value: 'active', label: 'Active' }, { value: 'disabled', label: 'Disabled' }] },
        ]}
        values={filters}
        onChange={(name, value) => setFilters((f) => ({ ...f, [name]: value }))}
        onApply={() => load()}
        onReset={() => setFilters({ check_type: '', status: '' })}
      />

      <div className="mt-4">
        <DataTable
          columns={columns as unknown as Column<Record<string, unknown>>[]}
          data={items as unknown as Record<string, unknown>[]}
          keyExtractor={(row) => String(row.id)}
          loading={loading}
          emptyMessage="No validation checks."
        />
      </div>
    </div>
  );
}
