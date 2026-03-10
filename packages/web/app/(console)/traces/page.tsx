'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { FilterPanel } from '@/components/ui/FilterPanel';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import type { TraceSummary } from '@/lib/api/evidence';
import { getTraces, createEvidenceExport, getExportStatus } from '@/lib/api/evidence';

export default function TracesPage() {
  const [items, setItems] = useState<TraceSummary[]>([]);
  const [pagination, setPagination] = useState({ page: 1, page_size: 10, total: 0, has_more: false });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Record<string, string>>({ status: '', agent_id: '', action_type: '' });
  const [exportOpen, setExportOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json');
  const [exportFilters, setExportFilters] = useState({ agent_id: '', action_type: '', status: '', start_time: '', end_time: '' });
  const [exportId, setExportId] = useState<string | null>(null);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [exportDownloadUrl, setExportDownloadUrl] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await getTraces({
        page,
        page_size: 10,
        status: filters.status || undefined,
        agent_id: filters.agent_id || undefined,
        action_type: filters.action_type || undefined,
      });
      setItems(res.data.items);
      setPagination(res.data.pagination);
    } catch (e) {
      console.error(e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [filters.status, filters.agent_id, filters.action_type]);

  useEffect(() => {
    load(pagination.page);
  }, [load, pagination.page]);

  const columns = [
    { key: 'id', header: 'Trace', render: (row: TraceSummary) => <Link href={`/traces/${row.id}`} className="text-primary-600 hover:underline font-mono text-sm">{String(row.id).slice(0, 8)}…</Link> },
    { key: 'action_type', header: 'Action' },
    { key: 'target_resource', header: 'Resource', render: (row: TraceSummary) => String(row.target_resource).slice(0, 40) + (String(row.target_resource).length > 40 ? '…' : '') },
    { key: 'status', header: 'Status', render: (row: TraceSummary) => <StatusBadge status={row.status} /> },
    { key: 'request_timestamp', header: 'Time', render: (row: TraceSummary) => row.request_timestamp ? new Date(row.request_timestamp).toLocaleString() : '—' },
  ];

  const startExport = async () => {
    setExporting(true);
    setExportError(null);
    setExportStatus('processing');
    setExportDownloadUrl(null);
    try {
      const res = await createEvidenceExport({
        format: exportFormat,
        agent_id: exportFilters.agent_id || undefined,
        action_type: exportFilters.action_type || undefined,
        status: exportFilters.status || undefined,
        start_time: exportFilters.start_time || undefined,
        end_time: exportFilters.end_time || undefined,
      });
      setExportId(res.data.export_id);
      const poll = setInterval(async () => {
        try {
          const s = await getExportStatus(res.data.export_id);
          setExportStatus(s.data.status);
          if (s.data.status === 'completed' && s.data.download_url) {
            setExportDownloadUrl(s.data.download_url);
            clearInterval(poll);
            setExporting(false);
          } else if (s.data.status === 'failed') {
            setExportError(s.data.error_message ?? 'Export failed');
            clearInterval(poll);
            setExporting(false);
          }
        } catch {
          clearInterval(poll);
          setExporting(false);
        }
      }, 2000);
      setTimeout(() => clearInterval(poll), 120000);
    } catch (e) {
      setExportError(e instanceof Error ? e.message : 'Export failed');
      setExporting(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Traces</h1>
          <p className="mt-2 text-slate-600">Search and inspect evidence traces.</p>
        </div>
        <Button variant="secondary" onClick={() => { setExportOpen(true); setExportStatus(null); setExportId(null); setExportDownloadUrl(null); setExportError(null); }}>Export</Button>
      </div>

      <FilterPanel
        fields={[
          { name: 'status', label: 'Status', type: 'select', options: [{ value: 'pending', label: 'Pending' }, { value: 'success', label: 'Success' }, { value: 'denied', label: 'Denied' }, { value: 'failed', label: 'Failed' }] },
          { name: 'agent_id', label: 'Agent ID', type: 'text', placeholder: 'Filter by agent' },
          { name: 'action_type', label: 'Action type', type: 'text', placeholder: 'e.g. commit_change' },
        ]}
        values={filters}
        onChange={(name, value) => setFilters((f) => ({ ...f, [name]: value }))}
        onApply={() => load(1)}
        onReset={() => setFilters({ status: '', agent_id: '', action_type: '' })}
      />

      <div className="mt-4">
        <DataTable
          columns={columns as unknown as Column<Record<string, unknown>>[]}
          data={items as unknown as Record<string, unknown>[]}
          keyExtractor={(row) => String(row.id)}
          loading={loading}
          emptyMessage="No traces found."
        />
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
        <span>Page {pagination.page} · Total {pagination.total}</span>
        <div className="gap-2 flex">
          <Button variant="secondary" disabled={pagination.page <= 1} onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}>Previous</Button>
          <Button variant="secondary" disabled={!pagination.has_more} onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}>Next</Button>
        </div>
      </div>

      <Modal
        open={exportOpen}
        onClose={() => !exporting && setExportOpen(false)}
        title="Export traces"
        footer={
          !exportDownloadUrl ? (
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setExportOpen(false)} disabled={exporting}>Cancel</Button>
              <Button onClick={startExport} disabled={exporting}>{exporting ? 'Exporting…' : 'Start export'}</Button>
            </div>
          ) : (
            <div className="flex justify-end">
              <a href={exportDownloadUrl} download className="inline-block"><Button>Download</Button></a>
            </div>
          )
        }
      >
        {!exportId ? (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700">Format</label>
              <select className="mt-1 rounded border border-slate-300 px-3 py-2" value={exportFormat} onChange={(e) => setExportFormat(e.target.value as 'json' | 'csv')}>
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Agent ID</label>
              <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={exportFilters.agent_id} onChange={(e) => setExportFilters((f) => ({ ...f, agent_id: e.target.value }))} placeholder="Optional" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Action type</label>
              <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={exportFilters.action_type} onChange={(e) => setExportFilters((f) => ({ ...f, action_type: e.target.value }))} placeholder="Optional" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Status</label>
              <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={exportFilters.status} onChange={(e) => setExportFilters((f) => ({ ...f, status: e.target.value }))} placeholder="Optional" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Start time (ISO)</label>
              <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={exportFilters.start_time} onChange={(e) => setExportFilters((f) => ({ ...f, start_time: e.target.value }))} placeholder="Optional" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">End time (ISO)</label>
              <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={exportFilters.end_time} onChange={(e) => setExportFilters((f) => ({ ...f, end_time: e.target.value }))} placeholder="Optional" />
            </div>
          </div>
        ) : (
          <div>
            {exportError && <p className="text-red-600 mb-2">{exportError}</p>}
            {exportStatus === 'processing' && <p className="text-slate-600">Export in progress…</p>}
            {exportDownloadUrl && <p className="text-green-600">Export ready. Use the Download button.</p>}
          </div>
        )}
      </Modal>
    </div>
  );
}
