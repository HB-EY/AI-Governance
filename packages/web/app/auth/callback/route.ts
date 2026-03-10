import { NextRequest, NextResponse } from 'next/server';
import {
  exchangeCodeForTokens,
  parseIdTokenClaims,
  createSessionToken,
  sessionCookieOptions,
} from '@/lib/auth';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error)}`, request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=missing_code', request.url));
  }

  const redirectUri = process.env.OAUTH_REDIRECT_URI ?? `${request.nextUrl.origin}/auth/callback`;
  try {
    const tokens = await exchangeCodeForTokens(code, redirectUri);
    const idToken = tokens.id_token ?? tokens.access_token;
    if (!idToken) {
      return NextResponse.redirect(new URL('/login?error=no_tokens', request.url));
    }

    const claims = parseIdTokenClaims(idToken);
    const sessionToken = await createSessionToken({
      sub: claims.sub,
      email: claims.email,
      roles: claims.roles ?? [],
    });

    const { name, value, options } = sessionCookieOptions(sessionToken);
    const response = NextResponse.redirect(new URL(state && state !== 'dashboard' ? state : '/dashboard', request.url));
    response.cookies.set(name, value, options);
    return response;
  } catch (e) {
    console.error('Auth callback error', e);
    return NextResponse.redirect(new URL('/login?error=exchange_failed', request.url));
  }
}
