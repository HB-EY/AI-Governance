'use client';

import { StatusBadge } from './StatusBadge';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  onSort?: (key: string) => void;
  sortKey?: string;
  sortOrder?: 'asc' | 'desc';
  loading?: boolean;
  emptyMessage?: string;
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  keyExtractor,
  onSort,
  sortKey,
  sortOrder,
  loading,
  emptyMessage = 'No data',
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="animate-pulse bg-white">
            {[1, 2, 3].map((i) => (
              <tr key={i}>
                {columns.map((col) => (
                  <td key={col.key} className="px-6 py-4">
                    <div className="h-4 rounded bg-slate-200" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">
                {onSort ? (
                  <button
                    type="button"
                    onClick={() => onSort(col.key)}
                    className="hover:text-slate-700"
                  >
                    {col.header}
                    {sortKey === col.key && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                  </button>
                ) : (
                  col.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-8 text-center text-slate-500">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr key={keyExtractor(row)} className="hover:bg-slate-50">
                {columns.map((col) => (
                  <td key={col.key} className="px-6 py-4 text-sm text-slate-900">
                    {col.render
                      ? col.render(row)
                      : typeof row[col.key] === 'string' && (row[col.key] as string).match(/^(active|pending|success|failed|denied|disabled)$/)
                        ? <StatusBadge status={row[col.key] as string} />
                        : String(row[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
