'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import type { PolicyDetail } from '@/lib/api/policies';
import { getPolicy, disablePolicy, enablePolicy } from '@/lib/api/policies';

export default function PolicyDetailPage() {
  const params = useParams();
  const policyId = params.policyId as string;
  const [policy, setPolicy] = useState<PolicyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [disableModal, setDisableModal] = useState(false);
  const [enableModal, setEnableModal] = useState(false);
  const [reason, setReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    getPolicy(policyId)
      .then((res) => setPolicy(res.data))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [policyId]);

  const status = policy?.version?.status ?? 'active';

  const onDisable = async () => {
    if (!policy) return;
    setActionLoading(true);
    try {
      const res = await disablePolicy(policyId, reason);
      setPolicy(res.data);
      setDisableModal(false);
      setReason('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to disable');
    } finally {
      setActionLoading(false);
    }
  };

  const onEnable = async () => {
    if (!policy) return;
    setActionLoading(true);
    try {
      const res = await enablePolicy(policyId);
      setPolicy(res.data);
      setEnableModal(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to enable');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="animate-pulse rounded bg-slate-200 h-8 w-48" />;
  if (error || !policy) return <div className="text-red-600">{error ?? 'Policy not found'}</div>;

  const breadcrumbs = [{ label: 'Policies', href: '/policies' }, { label: policy.name, href: `/policies/${policyId}` }];

  return (
    <div>
      <Breadcrumbs items={breadcrumbs} />
      <div className="mt-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{policy.name}</h1>
          <StatusBadge status={status} />
        </div>
        <div className="flex gap-2">
          {status === 'active' ? (
            <Button variant="secondary" onClick={() => setDisableModal(true)}>Disable</Button>
          ) : (
            <Button onClick={() => setEnableModal(true)}>Enable</Button>
          )}
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <div>
          <h2 className="text-sm font-medium text-slate-500">Description</h2>
          <p className="mt-1 text-slate-900">{policy.description || '—'}</p>
        </div>
        {policy.version && (
          <>
            <div>
              <h2 className="text-sm font-medium text-slate-500">Effect</h2>
              <p className="mt-1">{policy.version.effect}</p>
            </div>
            <div>
              <h2 className="text-sm font-medium text-slate-500">Priority</h2>
              <p className="mt-1">{policy.version.priority}</p>
            </div>
            {policy.version.requires_validation && (
              <div>
                <h2 className="text-sm font-medium text-slate-500">Validation types</h2>
                <p className="mt-1">{policy.version.validation_types?.join(', ') || '—'}</p>
              </div>
            )}
            {policy.version.requires_approval && (
              <div>
                <h2 className="text-sm font-medium text-slate-500">Approver roles</h2>
                <p className="mt-1">{policy.version.approver_roles?.join(', ') || '—'}</p>
              </div>
            )}
          </>
        )}
        <div>
          <h2 className="text-sm font-medium text-slate-500">Created</h2>
          <p className="mt-1">{policy.created_at ? new Date(policy.created_at).toLocaleString() : '—'}</p>
        </div>
      </div>

      <Modal open={disableModal} onClose={() => !actionLoading && setDisableModal(false)} title="Disable policy" footer={
        <>
          <Button variant="secondary" onClick={() => setDisableModal(false)} disabled={actionLoading}>Cancel</Button>
          <Button onClick={onDisable} disabled={actionLoading}>Disable</Button>
        </>
      }>
        <p className="text-slate-600">Optionally provide a reason.</p>
        <input className="mt-2 w-full rounded border border-slate-300 px-3 py-2" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason" />
      </Modal>

      <Modal open={enableModal} onClose={() => !actionLoading && setEnableModal(false)} title="Enable policy" footer={
        <>
          <Button variant="secondary" onClick={() => setEnableModal(false)} disabled={actionLoading}>Cancel</Button>
          <Button onClick={onEnable} disabled={actionLoading}>Enable</Button>
        </>
      }>
        <p className="text-slate-600">This policy will be evaluated for action requests again.</p>
      </Modal>
    </div>
  );
}
