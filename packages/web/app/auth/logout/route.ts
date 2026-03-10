import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookieName } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const name = getSessionCookieName();
  const response = NextResponse.redirect(new URL('/login', request.url));
  response.cookies.set(name, '', { path: '/', maxAge: 0 });
  return response;
}

export async function POST(request: NextRequest) {
  return GET(request);
}
