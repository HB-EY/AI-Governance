'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { TraceDetail } from '@/lib/api/evidence';
import { getTrace } from '@/lib/api/evidence';

export default function TraceDetailPage() {
  const params = useParams();
  const traceId = params.traceId as string;
  const [trace, setTrace] = useState<TraceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getTrace(traceId)
      .then((res) => setTrace(res.data))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [traceId]);

  if (loading) return <div className="animate-pulse rounded bg-slate-200 h-8 w-48" />;
  if (error || !trace) return <div className="text-red-600">{error ?? 'Trace not found'}</div>;

  const breadcrumbs = [{ label: 'Traces', href: '/traces' }, { label: String(trace.id).slice(0, 8) + '…', href: `/traces/${traceId}` }];

  return (
    <div>
      <Breadcrumbs items={breadcrumbs} />
      <div className="mt-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 font-mono text-lg">Trace {String(trace.id).slice(0, 8)}…</h1>
          <StatusBadge status={trace.status} />
        </div>
        <Link href="/traces"><span className="text-primary-600 hover:underline text-sm">Back to traces</span></Link>
      </div>

      <div className="mt-6 space-y-4">
        <div>
          <h2 className="text-sm font-medium text-slate-500">Action</h2>
          <p className="mt-1">{trace.action_type}</p>
        </div>
        <div>
          <h2 className="text-sm font-medium text-slate-500">Target resource</h2>
          <p className="mt-1 font-mono text-sm break-all">{trace.target_resource}</p>
        </div>
        <div>
          <h2 className="text-sm font-medium text-slate-500">Agent ID</h2>
          <p className="mt-1 font-mono text-sm">{trace.agent_id}</p>
        </div>
        <div>
          <h2 className="text-sm font-medium text-slate-500">Request time</h2>
          <p className="mt-1">{trace.request_timestamp ? new Date(trace.request_timestamp).toLocaleString() : '—'}</p>
        </div>
        {trace.completed_at && (
          <div>
            <h2 className="text-sm font-medium text-slate-500">Completed</h2>
            <p className="mt-1">{new Date(trace.completed_at).toLocaleString()}</p>
          </div>
        )}
        {trace.reasoning && (
          <div>
            <h2 className="text-sm font-medium text-slate-500">Reasoning</h2>
            <p className="mt-1 text-slate-700">{trace.reasoning}</p>
          </div>
        )}
        {trace.context && Object.keys(trace.context).length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-slate-500">Context</h2>
            <pre className="mt-1 rounded bg-slate-100 p-3 text-xs overflow-auto max-h-48">{JSON.stringify(trace.context, null, 2)}</pre>
          </div>
        )}
        {trace.events && trace.events.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-slate-500">Events</h2>
            <ul className="mt-2 space-y-2">
              {trace.events.map((evt: unknown, i: number) => (
                <li key={i} className="rounded border border-slate-200 p-2 text-sm">
                  <pre className="overflow-auto">{JSON.stringify(evt, null, 2)}</pre>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
