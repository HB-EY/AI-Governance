type Status = 'active' | 'inactive' | 'disabled' | 'pending' | 'success' | 'failed' | 'denied' | string;

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  success: 'bg-green-100 text-green-800',
  inactive: 'bg-slate-100 text-slate-700',
  disabled: 'bg-slate-100 text-slate-600',
  suspended: 'bg-amber-100 text-amber-800',
  pending: 'bg-amber-100 text-amber-800',
  failed: 'bg-red-100 text-red-800',
  denied: 'bg-red-100 text-red-800',
};

export function StatusBadge({ status }: { status: Status }) {
  const cls = statusColors[status] ?? 'bg-slate-100 text-slate-600';
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}
