import { NextResponse } from 'next/server';
import { isStubAuthEnabled, safeNextPath, SESSION_COOKIE } from '@/lib/session';

/**
 * DEV-ONLY stub sign-in. Replace with Pipes authentication.
 */
export async function POST(req: Request) {
  const url = new URL(req.url);
  const form = await req.formData().catch(() => null);
  const next = safeNextPath((form?.get('next') as string | null) ?? url.searchParams.get('next'));

  if (!isStubAuthEnabled()) {
    return NextResponse.redirect(new URL('/login?unavailable=1', url), 303);
  }

  const res = NextResponse.redirect(new URL(next, url), 303);
  res.cookies.set(SESSION_COOKIE, 'dev-stub', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
