import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const LOGIN_PATH = '/login';
const SESSION_COOKIE = 'ai_gov_session';

export function middleware(request: NextRequest) {
  const session = request.cookies.get(SESSION_COOKIE)?.value;
  const { pathname } = request.nextUrl;

  if (pathname === LOGIN_PATH) {
    if (session) return NextResponse.redirect(new URL('/dashboard', request.url));
    return NextResponse.next();
  }

  const isDev = process.env.NODE_ENV === 'development';
  if (!session && !isDev) {
    const login = new URL(LOGIN_PATH, request.url);
    login.searchParams.set('from', pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
