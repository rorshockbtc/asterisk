import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { resolveWorkspaceOwner } from '@/lib/workspace-store';

export async function GET(req: Request) {
  const owner = await resolveWorkspaceOwner();
  const origin = new URL(req.url).origin;
  if (!owner.ok) {
    return NextResponse.redirect(new URL('/sign-in?redirect_url=/app/setup', origin));
  }

  const appId = process.env.META_APP_ID;
  if (!appId) {
    return NextResponse.redirect(
      new URL('/app/setup?tab=publishing&oauth_error=missing_meta_app_id', origin)
    );
  }

  const state = crypto.randomBytes(16).toString('base64url');
  const redirectUri = `${origin}/api/auth/meta/callback`;
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    scope: 'pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish',
    response_type: 'code',
    state,
  });

  const res = NextResponse.redirect(`https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`);
  res.cookies.set('asterisk_meta_oauth', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 600,
  });
  return res;
}
