'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { registerAgent } from '@/lib/api/agents';

const CAPABILITIES = ['read', 'propose_change', 'commit_change', 'query', 'execute_tool', 'call_model'] as const;

export default function NewAgentPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const toggleCap = (cap: string) => {
    setCapabilities((prev) => prev.includes(cap) ? prev.filter((c) => c !== cap) : [...prev, cap]);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await registerAgent({
        name: name.trim(),
        description: description.trim() || undefined,
        owner_id: ownerId.trim(),
        owner_email: ownerEmail.trim() || undefined,
        capabilities: capabilities.length ? capabilities : ['read'],
      });
      setApiKey(res.data.api_key);
      setShowKeyModal(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  const copyKey = () => {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const closeKeyModal = () => {
    setShowKeyModal(false);
    setApiKey(null);
    router.push('/agents');
  };

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Agents', href: '/agents' }, { label: 'Register agent', href: '/agents/new' }]} />
      <h1 className="mt-4 text-2xl font-semibold text-slate-900">Register agent</h1>
      <p className="mt-2 text-slate-600">Create a new agent. The API key is shown only once.</p>

      <form onSubmit={onSubmit} className="mt-6 max-w-xl space-y-4">
        {error && <div className="rounded bg-red-50 px-4 py-2 text-sm text-red-800">{error}</div>}
        <div>
          <label className="block text-sm font-medium text-slate-700">Name *</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm" placeholder="my-agent" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm" placeholder="Optional description" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Owner ID *</label>
          <input type="text" value={ownerId} onChange={(e) => setOwnerId(e.target.value)} required className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm" placeholder="user@example.com or team-uuid" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Owner email</label>
          <input type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm" placeholder="Optional" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Capabilities *</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {CAPABILITIES.map((cap) => (
              <label key={cap} className="inline-flex items-center gap-2 rounded border border-slate-300 px-3 py-1.5 text-sm">
                <input type="checkbox" checked={capabilities.includes(cap)} onChange={() => toggleCap(cap)} />
                {cap}
              </label>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={submitting}>Register</Button>
          <Link href="/agents"><Button type="button" variant="secondary">Cancel</Button></Link>
        </div>
      </form>

      <Modal open={showKeyModal} onClose={closeKeyModal} title="API key — save it now" footer={
        <Button onClick={closeKeyModal}>Done</Button>
      }>
        <p className="text-sm text-amber-800 font-medium">This key is shown only once. Store it securely.</p>
        <div className="mt-3 flex gap-2">
          <code className="flex-1 rounded bg-slate-100 px-3 py-2 text-sm break-all">{apiKey}</code>
          <Button variant="secondary" onClick={copyKey}>{copied ? 'Copied' : 'Copy'}</Button>
        </div>
      </Modal>
    </div>
  );
}
