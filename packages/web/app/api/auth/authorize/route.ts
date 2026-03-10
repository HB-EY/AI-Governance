import { NextRequest, NextResponse } from 'next/server';
import { buildAuthUrl } from '@/lib/auth';

const PKCE_COOKIE = 'ai_gov_pkce_verifier';

export async function GET(request: NextRequest) {
  const state = request.nextUrl.searchParams.get('state') ?? crypto.randomUUID();
  const codeVerifier = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '');
  const authUrl = buildAuthUrl(state, codeVerifier);

  const response = NextResponse.redirect(authUrl);
  response.cookies.set(PKCE_COOKIE, codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  });
  return response;
}
