'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const nav = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/agents', label: 'Agents' },
  { href: '/policies', label: 'Policies' },
  { href: '/traces', label: 'Traces' },
  { href: '/approvals', label: 'Approvals' },
  { href: '/validation', label: 'Validation' },
  { href: '/settings', label: 'Settings' },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex w-64 flex-col border-r border-slate-200 bg-white">
      <div className="flex h-16 items-center border-b border-slate-200 px-6">
        <span className="font-semibold text-slate-800">AI Governance</span>
      </div>
      <nav className="flex-1 space-y-0.5 p-4">
        {nav.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`block rounded-lg px-3 py-2 text-sm font-medium ${
              pathname === href
                ? 'bg-primary-100 text-primary-700'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
