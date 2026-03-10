'use client';

import Link from 'next/link';

export function Header() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div className="text-sm text-slate-500">Control Plane Admin</div>
      <div className="flex items-center gap-4">
        <Link
          href="/auth/logout"
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          Sign out
        </Link>
      </div>
    </header>
  );
}
