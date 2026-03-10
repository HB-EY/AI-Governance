'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import type { ValidationCheckSummary } from '@/lib/api/validation-checks';
import { getValidationCheck, updateValidationCheck } from '@/lib/api/validation-checks';

export default function ValidationCheckDetailPage() {
  const params = useParams();
  const checkId = params.checkId as string;
  const [check, setCheck] = useState<(ValidationCheckSummary & { configuration?: Record<string, unknown> }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getValidationCheck(checkId)
      .then((res) => setCheck(res.data))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [checkId]);

  const setStatus = async (status: 'active' | 'disabled') => {
    if (!check) return;
    try {
      const res = await updateValidationCheck(checkId, { status });
      setCheck(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    }
  };

  if (loading) return <div className="animate-pulse rounded bg-slate-200 h-8 w-48" />;
  if (error || !check) return <div className="text-red-600">{error ?? 'Check not found'}</div>;

  const breadcrumbs = [{ label: 'Validation', href: '/validation' }, { label: 'Checks', href: '/validation/checks' }, { label: check.name, href: `/validation/checks/${checkId}` }];

  return (
    <div>
      <Breadcrumbs items={breadcrumbs} />
      <div className="mt-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{check.name}</h1>
          <StatusBadge status={check.status} />
        </div>
        <div className="flex gap-2">
          {check.status === 'active' ? (
            <Button variant="secondary" onClick={() => setStatus('disabled')}>Disable</Button>
          ) : (
            <Button onClick={() => setStatus('active')}>Enable</Button>
          )}
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <div>
          <h2 className="text-sm font-medium text-slate-500">Type</h2>
          <p className="mt-1">{check.check_type}</p>
        </div>
        <div>
          <h2 className="text-sm font-medium text-slate-500">Description</h2>
          <p className="mt-1">{check.description}</p>
        </div>
        <div>
          <h2 className="text-sm font-medium text-slate-500">Timeout</h2>
          <p className="mt-1">{check.timeout_seconds}s</p>
        </div>
        {check.configuration && Object.keys(check.configuration).length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-slate-500">Configuration</h2>
            <pre className="mt-1 rounded bg-slate-100 p-3 text-xs overflow-auto max-h-64">{JSON.stringify(check.configuration, null, 2)}</pre>
          </div>
        )}
      </div>
      <div className="mt-6">
        <Link href="/validation/checks"><Button variant="secondary">Back to checks</Button></Link>
      </div>
    </div>
  );
}
