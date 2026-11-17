import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { resolveWorkspaceOwner } from '@/lib/workspace-store';

export async function GET(req: Request) {
  const owner = await resolveWorkspaceOwner();
  if (!owner.ok) {
    return NextResponse.redirect(new URL('/sign-in?redirect_url=/app/setup', req.url));
  }

  const clientId = process.env.X_CLIENT_ID;
  const origin = new URL(req.url).origin;
  if (!clientId) {
    return NextResponse.redirect(
      new URL('/app/setup?tab=publishing&oauth_error=missing_x_client_id', origin)
    );
  }

  const state = crypto.randomBytes(16).toString('base64url');
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');

  const redirectUri = `${origin}/api/auth/x/callback`;
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'tweet.read tweet.write users.read offline.access',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  const res = NextResponse.redirect(`https://twitter.com/i/oauth2/authorize?${params.toString()}`);
  res.cookies.set('asterisk_x_oauth', JSON.stringify({ state, codeVerifier }), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 600,
  });
  return res;
}
