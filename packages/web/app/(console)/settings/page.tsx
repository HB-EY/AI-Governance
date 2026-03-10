'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';

type TabId = 'general' | 'notifications' | 'retention' | 'users';

export default function SettingsPage() {
  const [tab, setTab] = useState<TabId>('general');
  const [saving, setSaving] = useState(false);
  const [general, setGeneral] = useState({
    control_plane_name: 'AI Governance',
    contact_email: '',
    policy_evaluation_timeout_ms: 5000,
    validation_checks_timeout_ms: 10000,
    downstream_timeout_ms: 30000,
    approval_expiration_seconds: 3600,
  });
  const [notifications, setNotifications] = useState({
    smtp_host: '',
    smtp_port: 587,
    webhook_url: '',
  });
  const [retention, setRetention] = useState({
    evidence_hot_days: 30,
    evidence_cold_days: 365,
    audit_log_days: 365,
  });

  const onSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 500));
    setSaving(false);
  };

  const tabs: { id: TabId; label: string }[] = [
    { id: 'general', label: 'General' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'retention', label: 'Retention' },
    { id: 'users', label: 'Users' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
      <p className="mt-2 text-slate-600">Control plane configuration. Platform Administrators only.</p>

      <div className="mt-6 flex gap-4 border-b border-slate-200">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`border-b-2 px-2 py-2 text-sm font-medium ${
              tab === t.id ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6 max-w-xl">
        {tab === 'general' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Control plane name</label>
              <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={general.control_plane_name} onChange={(e) => setGeneral((g) => ({ ...g, control_plane_name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Contact email</label>
              <input type="email" className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={general.contact_email} onChange={(e) => setGeneral((g) => ({ ...g, contact_email: e.target.value }))} placeholder="admin@example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Policy evaluation timeout (ms)</label>
              <input type="number" className="mt-1 w-32 rounded border border-slate-300 px-3 py-2" value={general.policy_evaluation_timeout_ms} onChange={(e) => setGeneral((g) => ({ ...g, policy_evaluation_timeout_ms: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Validation checks timeout (ms)</label>
              <input type="number" className="mt-1 w-32 rounded border border-slate-300 px-3 py-2" value={general.validation_checks_timeout_ms} onChange={(e) => setGeneral((g) => ({ ...g, validation_checks_timeout_ms: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Downstream action timeout (ms)</label>
              <input type="number" className="mt-1 w-32 rounded border border-slate-300 px-3 py-2" value={general.downstream_timeout_ms} onChange={(e) => setGeneral((g) => ({ ...g, downstream_timeout_ms: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Approval expiration (seconds)</label>
              <input type="number" className="mt-1 w-32 rounded border border-slate-300 px-3 py-2" value={general.approval_expiration_seconds} onChange={(e) => setGeneral((g) => ({ ...g, approval_expiration_seconds: Number(e.target.value) }))} />
            </div>
          </div>
        )}

        {tab === 'notifications' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">SMTP host</label>
              <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={notifications.smtp_host} onChange={(e) => setNotifications((n) => ({ ...n, smtp_host: e.target.value }))} placeholder="smtp.example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">SMTP port</label>
              <input type="number" className="mt-1 w-24 rounded border border-slate-300 px-3 py-2" value={notifications.smtp_port} onChange={(e) => setNotifications((n) => ({ ...n, smtp_port: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Approval webhook URL</label>
              <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={notifications.webhook_url} onChange={(e) => setNotifications((n) => ({ ...n, webhook_url: e.target.value }))} placeholder="https://..." />
            </div>
          </div>
        )}

        {tab === 'retention' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Evidence hot storage (days)</label>
              <input type="number" className="mt-1 w-24 rounded border border-slate-300 px-3 py-2" value={retention.evidence_hot_days} onChange={(e) => setRetention((r) => ({ ...r, evidence_hot_days: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Evidence cold storage (days)</label>
              <input type="number" className="mt-1 w-24 rounded border border-slate-300 px-3 py-2" value={retention.evidence_cold_days} onChange={(e) => setRetention((r) => ({ ...r, evidence_cold_days: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Audit log retention (days)</label>
              <input type="number" className="mt-1 w-24 rounded border border-slate-300 px-3 py-2" value={retention.audit_log_days} onChange={(e) => setRetention((r) => ({ ...r, audit_log_days: Number(e.target.value) }))} />
            </div>
          </div>
        )}

        {tab === 'users' && (
          <div>
            <p className="text-slate-600">User roles and permissions are managed in your identity provider. This view is read-only.</p>
            <div className="mt-4 rounded border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Platform Administrator: full access to settings, agents, policies, and exports.</p>
              <p className="mt-2 text-sm text-slate-500">Risk/Compliance Lead: view traces, approvals, export audit reports.</p>
            </div>
          </div>
        )}

        {tab !== 'users' && (
          <div className="mt-6">
            <Button onClick={onSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </div>
        )}
      </div>
    </div>
  );
}
