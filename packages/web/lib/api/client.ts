/**
 * Base API client for admin console (fetch to control plane API).
 * Throws ApiError with status and structured message for error handling (WO-47).
 */

const getBase = () => (typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_API_URL ?? '') : process.env.NEXT_PUBLIC_API_URL ?? '');

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const base = getBase();
  const url = base ? `${base.replace(/\/$/, '')}${path}` : path;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: { message?: string; code?: string; details?: unknown } };
    const msg = body?.error?.message ?? `HTTP ${res.status}`;
    throw new ApiError(msg, res.status, body?.error?.code, body?.error?.details);
  }
  return res.json() as Promise<T>;
}
