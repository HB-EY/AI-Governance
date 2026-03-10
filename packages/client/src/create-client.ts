/**
 * Create a configured API client with baseUrl, auth, and retry.
 */

import { createClient, createConfig } from '@hey-api/client-fetch';

const DEFAULT_RETRIES = 3;
const INITIAL_BACKOFF_MS = 500;

export interface ApiClientConfig {
  baseUrl: string;
  /** Return Bearer token for agent or user auth (e.g. agk_<jwt> or session JWT). */
  getToken?: () => string | Promise<string>;
  retries?: number;
}

async function fetchWithRetry(
  request: Request,
  retries: number,
  attempt = 0
): Promise<Response> {
  const res = await fetch(request);
  if (res.ok || attempt >= retries) return res;
  const retryable = res.status === 408 || res.status === 429 || res.status >= 500;
  if (!retryable) return res;
  const delay = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
  await new Promise((r) => setTimeout(r, delay));
  return fetchWithRetry(request, retries, attempt + 1);
}

export function createApiClient(config: ApiClientConfig) {
  const { baseUrl, getToken, retries = DEFAULT_RETRIES } = config;
  const base = baseUrl.replace(/\/$/, '');
  const customFetch = async (req: Request): Promise<Response> => {
    let reqToUse = req;
    if (getToken) {
      const token = typeof getToken() === 'string' ? getToken() : await getToken();
      if (token) {
        const headers = new Headers(req.headers);
        headers.set('Authorization', `Bearer ${token}`);
        reqToUse = new Request(req, { headers });
      }
    }
    return fetchWithRetry(reqToUse, retries);
  };
  const client = createClient(
    createConfig({
      baseUrl: base,
      fetch: customFetch,
    })
  );
  return { client };
}

export type ApiClient = ReturnType<typeof createApiClient>;
