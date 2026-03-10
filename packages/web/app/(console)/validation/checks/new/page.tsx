'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Button } from '@/components/ui/Button';
import { createValidationCheck } from '@/lib/api/validation-checks';

const CHECK_TYPES = ['schema', 'pii', 'sentiment', 'business-rule', 'format'];

export default function NewValidationCheckPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [checkType, setCheckType] = useState('schema');
  const [description, setDescription] = useState('');
  const [timeoutSeconds, setTimeoutSeconds] = useState(5);
  const [configJson, setConfigJson] = useState('{}');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    let configuration: Record<string, unknown> = {};
    try {
      configuration = configJson.trim() ? JSON.parse(configJson) : {};
    } catch {
      setError('Configuration must be valid JSON');
      return;
    }
    setSubmitting(true);
    try {
      await createValidationCheck({
        name: name.trim(),
        check_type: checkType,
        description: description.trim() || name.trim(),
        configuration,
        timeout_seconds: timeoutSeconds,
      });
      router.push('/validation/checks');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create');
    } finally {
      setSubmitting(false);
    }
  };

  const breadcrumbs = [{ label: 'Validation', href: '/validation' }, { label: 'Checks', href: '/validation/checks' }, { label: 'New', href: '/validation/checks/new' }];

  return (
    <div>
      <Breadcrumbs items={breadcrumbs} />
      <h1 className="mt-4 text-2xl font-semibold text-slate-900">Create validation check</h1>
      <p className="mt-2 text-slate-600">Add a new validation check. Configure based on type (schema: JSON schema, pii: types/action, sentiment: threshold, business-rule: endpoint_url).</p>

      <form onSubmit={onSubmit} className="mt-6 max-w-xl space-y-4">
        {error && <p className="text-red-600">{error}</p>}
        <div>
          <label className="block text-sm font-medium text-slate-700">Name</label>
          <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Check type</label>
          <select className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={checkType} onChange={(e) => setCheckType(e.target.value)}>
            {CHECK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Description</label>
          <textarea className="mt-1 w-full rounded border border-slate-300 px-3 py-2" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Timeout (seconds)</label>
          <input type="number" min={1} max={300} className="mt-1 w-24 rounded border border-slate-300 px-3 py-2" value={timeoutSeconds} onChange={(e) => setTimeoutSeconds(Number(e.target.value))} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Configuration (JSON)</label>
          <textarea className="mt-1 w-full rounded border border-slate-300 px-3 py-2 font-mono text-sm" rows={6} value={configJson} onChange={(e) => setConfigJson(e.target.value)} placeholder='{"schema": {...}} or {"endpoint_url": "..."} or {"threshold": -0.5}' />
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={submitting}>Create</Button>
          <Link href="/validation/checks"><Button type="button" variant="secondary">Cancel</Button></Link>
        </div>
      </form>
    </div>
  );
}
