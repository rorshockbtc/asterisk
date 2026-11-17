import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { resolveWorkspaceOwner } from '@/lib/workspace-store';

export async function GET(req: Request) {
  const owner = await resolveWorkspaceOwner();
  const origin = new URL(req.url).origin;
  if (!owner.ok) {
    return NextResponse.redirect(new URL('/sign-in?redirect_url=/app/setup', origin));
  }

  const clientId = process.env.THREADS_APP_ID;
  if (!clientId) {
    return NextResponse.redirect(
      new URL('/app/setup?tab=publishing&oauth_error=missing_threads_app_id', origin)
    );
  }

  const state = crypto.randomBytes(16).toString('base64url');
  const redirectUri = `${origin}/api/auth/threads/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'threads_basic,threads_content_publish',
    response_type: 'code',
    state,
  });

  const res = NextResponse.redirect(`https://threads.net/oauth/authorize?${params.toString()}`);
  res.cookies.set('asterisk_threads_oauth', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 600,
  });
  return res;
}
