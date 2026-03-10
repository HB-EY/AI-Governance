/**
 * OAuth2/OIDC helpers: PKCE, auth URL, token exchange, session cookie.
 */

import { SignJWT, jwtVerify } from 'jose';

const SESSION_COOKIE = 'ai_gov_session';
const SESSION_MAX_AGE = 8 * 60 * 60; // 8 hours

export interface SessionPayload {
  sub: string;
  email?: string;
  roles: string[];
  exp: number;
  iat: number;
}

export function getSessionCookieName(): string {
  return SESSION_COOKIE;
}

export function getSessionMaxAge(): number {
  return SESSION_MAX_AGE;
}

export function buildAuthUrl(state: string, _codeVerifier: string): string {
  const base = process.env.OAUTH_AUTHORIZATION_URL ?? 'https://accounts.example.com/oauth2/v1/authorize';
  const clientId = process.env.OAUTH_CLIENT_ID ?? '';
  const redirectUri = process.env.OAUTH_REDIRECT_URI ?? 'http://localhost:3001/auth/callback';
  const scope = process.env.OAUTH_SCOPE ?? 'openid profile email';
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope,
    state,
  });
  return `${base}?${params.toString()}`;
}

export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string,
  codeVerifier?: string
): Promise<{ id_token?: string; access_token?: string }> {
  const tokenUrl = process.env.OAUTH_TOKEN_URL ?? 'https://accounts.example.com/oauth2/v1/token';
  const clientId = process.env.OAUTH_CLIENT_ID ?? '';
  const clientSecret = process.env.OAUTH_CLIENT_SECRET ?? '';
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    ...(clientSecret ? { client_secret: clientSecret } : {}),
    ...(codeVerifier ? { code_verifier: codeVerifier } : {}),
  });
  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`);
  return res.json();
}

export function parseIdTokenClaims(idToken: string): { sub: string; email?: string; roles?: string[] } {
  const parts = idToken.split('.');
  if (parts.length !== 3) throw new Error('Invalid ID token');
  const payload = JSON.parse(Buffer.from(parts[1]!, 'base64url').toString('utf8'));
  return {
    sub: payload.sub ?? '',
    email: payload.email,
    roles: payload.roles ?? payload.groups ?? [],
  };
}

export async function createSessionToken(payload: Omit<SessionPayload, 'exp' | 'iat'>): Promise<string> {
  const secret = new TextEncoder().encode(process.env.SESSION_SECRET ?? 'dev-secret-change-in-production');
  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;
  const jwt = await new SignJWT({ ...payload, roles: payload.roles })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(secret);
  return jwt;
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const secret = new TextEncoder().encode(process.env.SESSION_SECRET ?? 'dev-secret-change-in-production');
    const { payload } = await jwtVerify(token, secret);
    return {
      sub: payload.sub as string,
      email: payload.email as string | undefined,
      roles: (payload.roles as string[]) ?? [],
      exp: payload.exp as number,
      iat: payload.iat as number,
    };
  } catch {
    return null;
  }
}

export function sessionCookieOptions(serialized: string): { name: string; value: string; options: Record<string, unknown> } {
  return {
    name: SESSION_COOKIE,
    value: serialized,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: SESSION_MAX_AGE,
      path: '/',
    },
  };
}
