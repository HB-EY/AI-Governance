'use client';

import Link from 'next/link';

export function Header() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-ey-charcoal px-6">
      <div className="text-sm font-medium text-white">Control Plane Admin</div>
      <div className="flex items-center gap-4">
        <Link
          href="/auth/logout"
          className="text-sm text-white/90 hover:text-ey-yellow transition-colors"
        >
          Sign out
        </Link>
      </div>
    </header>
  );
}
