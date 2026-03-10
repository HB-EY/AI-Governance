'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import type { AgentDetail } from '@/lib/api/agents';
import { getAgent, disableAgent, enableAgent } from '@/lib/api/agents';

export default function AgentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = params.agentId as string;
  const [agent, setAgent] = useState<AgentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [disableModal, setDisableModal] = useState(false);
  const [enableModal, setEnableModal] = useState(false);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getAgent(agentId)
      .then((res) => setAgent(res.data))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [agentId]);

  const onDisable = async () => {
    setSubmitting(true);
    try {
      await disableAgent(agentId, reason);
      setDisableModal(false);
      setReason('');
      const res = await getAgent(agentId);
      setAgent(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Disable failed');
    } finally {
      setSubmitting(false);
    }
  };

  const onEnable = async () => {
    setSubmitting(true);
    try {
      await enableAgent(agentId, note);
      setEnableModal(false);
      setNote('');
      const res = await getAgent(agentId);
      setAgent(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Enable failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="animate-pulse rounded bg-slate-200 h-8 w-48" />;
  if (error || !agent) return <div className="text-red-600">{error ?? 'Agent not found'}</div>;

  const breadcrumbs = [{ label: 'Agents', href: '/agents' }, { label: agent.name, href: `/agents/${agentId}` }];

  return (
    <div>
      <Breadcrumbs items={breadcrumbs} />
      <div className="mt-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{agent.name}</h1>
          <StatusBadge status={agent.status} />
        </div>
        <div className="flex gap-2">
          {agent.status === 'active' ? (
            <Button variant="secondary" onClick={() => setDisableModal(true)}>Disable</Button>
          ) : (
            <Button onClick={() => setEnableModal(true)}>Enable</Button>
          )}
        </div>
      </div>

      <dl className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-sm font-medium text-slate-500">Description</dt>
          <dd className="mt-1 text-slate-900">{agent.description || '—'}</dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-slate-500">Owner</dt>
          <dd className="mt-1 text-slate-900">{agent.owner_id} {agent.owner_email ? `(${agent.owner_email})` : ''}</dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-slate-500">Created</dt>
          <dd className="mt-1 text-slate-900">{new Date(agent.created_at).toLocaleString()}</dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-slate-500">Last active</dt>
          <dd className="mt-1 text-slate-900">{agent.last_active_at ? new Date(agent.last_active_at).toLocaleString() : '—'}</dd>
        </div>
        {agent.recent_actions_count_30d != null && (
          <div>
            <dt className="text-sm font-medium text-slate-500">Actions (30 days)</dt>
            <dd className="mt-1 text-slate-900">{agent.recent_actions_count_30d}</dd>
          </div>
        )}
        {agent.recent_violations_count_30d != null && (
          <div>
            <dt className="text-sm font-medium text-slate-500">Violations (30 days)</dt>
            <dd className="mt-1 text-slate-900">{agent.recent_violations_count_30d}</dd>
          </div>
        )}
      </dl>

      <Modal open={disableModal} onClose={() => setDisableModal(false)} title="Disable agent" footer={
        <>
          <Button variant="secondary" onClick={() => setDisableModal(false)}>Cancel</Button>
          <Button onClick={onDisable} disabled={submitting}>Disable</Button>
        </>
      }>
        <p className="text-sm text-slate-600">This agent will not be able to execute actions until re-enabled.</p>
        <label className="mt-3 block text-sm font-medium text-slate-700">Reason (optional)</label>
        <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm" placeholder="e.g. Security review" />
      </Modal>

      <Modal open={enableModal} onClose={() => setEnableModal(false)} title="Enable agent" footer={
        <>
          <Button variant="secondary" onClick={() => setEnableModal(false)}>Cancel</Button>
          <Button onClick={onEnable} disabled={submitting}>Enable</Button>
        </>
      }>
        <p className="text-sm text-slate-600">Re-enable this agent so it can execute actions again.</p>
        <label className="mt-3 block text-sm font-medium text-slate-700">Note (optional)</label>
        <input type="text" value={note} onChange={(e) => setNote(e.target.value)} className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm" placeholder="e.g. Issue resolved" />
      </Modal>
    </div>
  );
}
