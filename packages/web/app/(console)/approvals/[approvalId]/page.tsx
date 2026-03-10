'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import type { ApprovalDetail } from '@/lib/api/approvals';
import { getApproval, approveApproval, denyApproval } from '@/lib/api/approvals';

export default function ApprovalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const approvalId = params.approvalId as string;
  const [approval, setApproval] = useState<ApprovalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showApprove, setShowApprove] = useState(false);
  const [showDeny, setShowDeny] = useState(false);
  const [denyReason, setDenyReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getApproval(approvalId)
      .then((res) => setApproval(res.data))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [approvalId]);

  const onApprove = async () => {
    if (!approval) return;
    setSubmitting(true);
    try {
      await approveApproval(approvalId);
      setShowApprove(false);
      router.push('/approvals');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Approve failed');
    } finally {
      setSubmitting(false);
    }
  };

  const onDeny = async () => {
    if (!approval || !denyReason.trim()) return;
    setSubmitting(true);
    try {
      await denyApproval(approvalId, denyReason.trim());
      setShowDeny(false);
      setDenyReason('');
      router.push('/approvals');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Deny failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="animate-pulse rounded bg-slate-200 h-8 w-48" />;
  if (error || !approval) return <div className="text-red-600">{error ?? 'Approval not found'}</div>;

  const breadcrumbs = [{ label: 'Approvals', href: '/approvals' }, { label: String(approval.id).slice(0, 8) + '…', href: `/approvals/${approvalId}` }];
  const timeRemaining = approval.time_remaining_seconds ?? 0;
  const urgent = timeRemaining > 0 && timeRemaining < 15 * 60;

  return (
    <div>
      <Breadcrumbs items={breadcrumbs} />
      <div className="mt-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Approval request</h1>
          <StatusBadge status={approval.status} />
          {approval.status === 'pending' && (
            <p className={`mt-1 text-sm ${urgent ? 'text-red-600 font-medium' : 'text-slate-600'}`}>
              Time remaining: {Math.floor(timeRemaining / 60)} min {timeRemaining % 60} s
            </p>
          )}
        </div>
        {approval.status === 'pending' && (
          <div className="flex gap-2">
            <Button onClick={() => setShowApprove(true)}>Approve</Button>
            <Button variant="secondary" onClick={() => setShowDeny(true)}>Deny</Button>
          </div>
        )}
      </div>

      <div className="mt-6 space-y-4">
        <div>
          <h2 className="text-sm font-medium text-slate-500">Agent</h2>
          <p className="mt-1">{approval.agent_name ?? approval.agent_id}</p>
        </div>
        <div>
          <h2 className="text-sm font-medium text-slate-500">Action type</h2>
          <p className="mt-1">{approval.action_type}</p>
        </div>
        <div>
          <h2 className="text-sm font-medium text-slate-500">Summary</h2>
          <p className="mt-1">{approval.action_summary}</p>
        </div>
        {approval.evidence_summary && Object.keys(approval.evidence_summary).length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-slate-500">Evidence summary</h2>
            <pre className="mt-1 rounded bg-slate-100 p-3 text-xs overflow-auto max-h-64">{JSON.stringify(approval.evidence_summary, null, 2)}</pre>
          </div>
        )}
        <div>
          <Link href={`/traces/${approval.trace_id}`} className="text-primary-600 hover:underline text-sm">View full trace</Link>
        </div>
      </div>

      <Modal open={showApprove} onClose={() => !submitting && setShowApprove(false)} title="Approve" footer={
        <>
          <Button variant="secondary" onClick={() => setShowApprove(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={onApprove} disabled={submitting}>Approve</Button>
        </>
      }>
        <p className="text-slate-600">Allow this action to proceed?</p>
      </Modal>

      <Modal open={showDeny} onClose={() => !submitting && setShowDeny(false)} title="Deny" footer={
        <>
          <Button variant="secondary" onClick={() => setShowDeny(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={onDeny} disabled={submitting || !denyReason.trim()} variant="secondary">Deny</Button>
        </>
      }>
        <p className="text-slate-600">Reason for denial (required):</p>
        <textarea className="mt-2 w-full rounded border border-slate-300 px-3 py-2" rows={3} value={denyReason} onChange={(e) => setDenyReason(e.target.value)} placeholder="Enter reason" />
      </Modal>
    </div>
  );
}
