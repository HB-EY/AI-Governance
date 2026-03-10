import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <h1 className="text-2xl font-semibold text-slate-900">Page not found</h1>
      <p className="mt-2 text-slate-600">The page you requested could not be found.</p>
      <div className="mt-6 flex gap-4">
        <Link href="/dashboard" className="text-primary-600 hover:underline font-medium">Dashboard</Link>
        <Link href="/agents" className="text-primary-600 hover:underline font-medium">Agents</Link>
        <Link href="/traces" className="text-primary-600 hover:underline font-medium">Traces</Link>
      </div>
    </div>
  );
}
