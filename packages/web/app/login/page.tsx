'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function LoginForm() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const from = searchParams.get('from') ?? '/dashboard';
  const authUrl = `/api/auth/authorize?state=${encodeURIComponent(from)}`;

  return (
    <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-xl font-semibold text-slate-900">Sign in</h1>
      {error && (
        <p className="mt-2 text-sm text-red-600">Error: {error}</p>
      )}
      <p className="mt-2 text-sm text-slate-600">
        Sign in with your organization&apos;s identity provider.
      </p>
      <div className="mt-6 space-y-3">
        <a
          href={authUrl}
          className="block w-full rounded-lg bg-primary-600 py-2 text-center text-sm font-medium text-white hover:bg-primary-700"
        >
          Sign in with OAuth2
        </a>
        <a
          href="/dashboard"
          className="block w-full rounded-lg border border-slate-300 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Continue to dashboard (dev)
        </a>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100">
      <Suspense fallback={<div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-8 shadow-sm">Loading...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
