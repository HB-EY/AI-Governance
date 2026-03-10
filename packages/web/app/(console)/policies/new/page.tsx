'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Button } from '@/components/ui/Button';
import { createPolicy } from '@/lib/api/policies';
import type { PolicyRule } from '@/lib/api/policies';

const FIELDS = [
  { value: 'agent.capabilities', label: 'Agent capabilities' },
  { value: 'action.type', label: 'Action type' },
  { value: 'resource.pattern', label: 'Resource pattern' },
  { value: 'time.hour', label: 'Time hour' },
  { value: 'time.day_of_week', label: 'Day of week' },
];
const OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'matches', label: 'Matches (regex)' },
  { value: 'in', label: 'In' },
  { value: 'gt', label: 'Greater than' },
  { value: 'lt', label: 'Less than' },
];

export default function NewPolicyPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [effect, setEffect] = useState<'allow' | 'deny'>('allow');
  const [priority, setPriority] = useState(0);
  const [requiresValidation, setRequiresValidation] = useState(false);
  const [validationTypes, setValidationTypes] = useState('');
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [approverRoles, setApproverRoles] = useState('');
  const [rules, setRules] = useState<PolicyRule[]>([{ field: 'action.type', operator: 'equals', value: '' }]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const addRule = () => setRules((r) => [...r, { field: 'action.type', operator: 'equals', value: '' }]);
  const removeRule = (i: number) => setRules((r) => r.filter((_, idx) => idx !== i));
  const updateRule = (i: number, key: keyof PolicyRule, val: unknown) => {
    setRules((r) => r.map((rule, idx) => (idx === i ? { ...rule, [key]: val } : rule)));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    const parsedRules = rules.map((r) => ({
      ...r,
      value: typeof r.value === 'string' && (r.value === 'true' || r.value === 'false') ? r.value === 'true' : (typeof r.value === 'string' && !isNaN(Number(r.value)) ? Number(r.value) : r.value),
    }));
    setSubmitting(true);
    try {
      await createPolicy({
        name: name.trim(),
        description: description.trim() || name.trim(),
        rules: parsedRules,
        effect,
        priority,
        requires_validation: requiresValidation,
        validation_types: validationTypes ? validationTypes.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
        requires_approval: requiresApproval,
        approver_roles: approverRoles ? approverRoles.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
      });
      router.push('/policies');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create policy');
    } finally {
      setSubmitting(false);
    }
  };

  const breadcrumbs = [{ label: 'Policies', href: '/policies' }, { label: 'New policy', href: '/policies/new' }];

  return (
    <div>
      <Breadcrumbs items={breadcrumbs} />
      <h1 className="mt-4 text-2xl font-semibold text-slate-900">Create policy</h1>
      <p className="mt-2 text-slate-600">Define a new governance policy with rules and effect.</p>

      <form onSubmit={onSubmit} className="mt-6 max-w-2xl space-y-4">
        {error && <p className="text-red-600">{error}</p>}
        <div>
          <label className="block text-sm font-medium text-slate-700">Name</label>
          <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Description</label>
          <textarea className="mt-1 w-full rounded border border-slate-300 px-3 py-2" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Effect</label>
          <select className="mt-1 rounded border border-slate-300 px-3 py-2" value={effect} onChange={(e) => setEffect(e.target.value as 'allow' | 'deny')}>
            <option value="allow">Allow</option>
            <option value="deny">Deny</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Priority</label>
          <input type="number" className="mt-1 w-24 rounded border border-slate-300 px-3 py-2" value={priority} onChange={(e) => setPriority(Number(e.target.value))} />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-slate-700">Rules</label>
            <Button type="button" variant="secondary" onClick={addRule}>Add rule</Button>
          </div>
          <div className="mt-2 space-y-2">
            {rules.map((rule, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2 rounded border border-slate-200 p-2">
                <select value={rule.field} onChange={(e) => updateRule(i, 'field', e.target.value)} className="rounded border px-2 py-1 text-sm">
                  {FIELDS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
                <select value={rule.operator} onChange={(e) => updateRule(i, 'operator', e.target.value)} className="rounded border px-2 py-1 text-sm">
                  {OPERATORS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <input className="min-w-[120px] rounded border px-2 py-1 text-sm" value={String(rule.value)} onChange={(e) => updateRule(i, 'value', e.target.value)} placeholder="Value" />
                <Button type="button" variant="secondary" onClick={() => removeRule(i)}>Remove</Button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input type="checkbox" id="reqVal" checked={requiresValidation} onChange={(e) => setRequiresValidation(e.target.checked)} />
          <label htmlFor="reqVal">Requires validation</label>
        </div>
        {requiresValidation && (
          <div>
            <label className="block text-sm font-medium text-slate-700">Validation types (comma-separated)</label>
            <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={validationTypes} onChange={(e) => setValidationTypes(e.target.value)} placeholder="schema, pii" />
          </div>
        )}

        <div className="flex items-center gap-2">
          <input type="checkbox" id="reqApp" checked={requiresApproval} onChange={(e) => setRequiresApproval(e.target.checked)} />
          <label htmlFor="reqApp">Requires approval</label>
        </div>
        {requiresApproval && (
          <div>
            <label className="block text-sm font-medium text-slate-700">Approver roles (comma-separated)</label>
            <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={approverRoles} onChange={(e) => setApproverRoles(e.target.value)} placeholder="admin, compliance" />
          </div>
        )}

        <div className="flex gap-2">
          <Button type="submit" disabled={submitting}>Create policy</Button>
          <Link href="/policies"><Button type="button" variant="secondary">Cancel</Button></Link>
        </div>
      </form>
    </div>
  );
}
