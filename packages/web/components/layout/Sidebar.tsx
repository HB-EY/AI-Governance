'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

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
  const [logoError, setLogoError] = useState(false);
  return (
    <aside className="flex w-64 flex-col border-r border-ey-charcoal/50 bg-ey-black">
      <div className="flex h-16 items-center border-b border-ey-charcoal/50 px-4">
        {!logoError ? (
          <Image
            src="/ey-logo.png"
            alt="EY"
            width={80}
            height={32}
            className="h-8 w-auto object-contain"
            priority
            onError={() => setLogoError(true)}
          />
        ) : (
          <span className="text-xl font-bold tracking-tight text-white">EY</span>
        )}
        <span className="ml-2 text-sm font-medium text-white opacity-90">AI Governance</span>
      </div>
      <nav className="flex-1 space-y-0.5 p-4">
        {nav.map(({ href, label }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-ey-charcoal text-ey-yellow'
                  : 'text-white hover:bg-ey-charcoal/80 hover:text-ey-yellow'
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
