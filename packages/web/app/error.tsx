'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  const errorId = error.digest ?? `err-${Date.now()}`;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <h1 className="text-2xl font-semibold text-slate-900">Something went wrong</h1>
      <p className="mt-2 text-slate-600">An unexpected error occurred. Please try again.</p>
      <p className="mt-2 text-sm text-slate-500">Error ID: {errorId} (provide this to support if the issue persists)</p>
      <div className="mt-6 flex gap-4">
        <button
          type="button"
          onClick={reset}
          className="rounded bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
        >
          Try again
        </button>
        <Link href="/dashboard" className="rounded border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-100">
          Dashboard
        </Link>
      </div>
    </div>
  );
}
