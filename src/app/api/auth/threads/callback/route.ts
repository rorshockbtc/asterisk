import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { upsertPlatformConnection } from '@/lib/oauth-connections';
import { resolveWorkspaceOwner } from '@/lib/workspace-store';

export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  const owner = await resolveWorkspaceOwner();
  if (!owner.ok) {
    return NextResponse.redirect(new URL('/sign-in?redirect_url=/app/setup', origin));
  }

  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const errorParam = url.searchParams.get('error');

  if (errorParam || !code || !state) {
    return NextResponse.redirect(
      new URL(`/app/setup?tab=publishing&oauth_error=${encodeURIComponent(errorParam || 'threads_denied')}`, origin)
    );
  }

  const cookieStore = await cookies();
  const savedState = cookieStore.get('asterisk_threads_oauth')?.value;
  if (!savedState || savedState !== state) {
    return NextResponse.redirect(
      new URL('/app/setup?tab=publishing&oauth_error=threads_state_mismatch', origin)
    );
  }

  const clientId = process.env.THREADS_APP_ID;
  const clientSecret = process.env.THREADS_APP_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL('/app/setup?tab=publishing&oauth_error=missing_threads_app_credentials', origin)
    );
  }

  const redirectUri = `${origin}/api/auth/threads/callback`;
  const tokenRes = await fetch('https://graph.threads.net/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code,
    }),
  });

  const shortJson = (await tokenRes.json()) as {
    access_token?: string;
    user_id?: string | number;
    error_message?: string;
  };
  if (!tokenRes.ok || !shortJson.access_token) {
    return NextResponse.redirect(
      new URL(
        `/app/setup?tab=publishing&oauth_error=${encodeURIComponent(shortJson.error_message || 'threads_token_failed')}`,
        origin
      )
    );
  }

  let finalToken = shortJson.access_token;
  let expiresAt: string | null = null;
  try {
    const longRes = await fetch(
      `https://graph.threads.net/access_token?grant_type=th_exchange_token&client_secret=${encodeURIComponent(clientSecret)}&access_token=${encodeURIComponent(finalToken)}`
    );
    if (longRes.ok) {
      const longJson = (await longRes.json()) as { access_token?: string; expires_in?: number };
      if (longJson.access_token) {
        finalToken = longJson.access_token;
        if (longJson.expires_in) {
          expiresAt = new Date(Date.now() + longJson.expires_in * 1000).toISOString();
        }
      }
    }
  } catch {
    // Keep short-lived token if exchange fails
  }

  let accountId: string | null = shortJson.user_id ? String(shortJson.user_id) : null;
  let accountHandle: string | null = null;
  try {
    const meRes = await fetch(
      `https://graph.threads.net/v1.0/me?fields=id,username&access_token=${encodeURIComponent(finalToken)}`
    );
    if (meRes.ok) {
      const meJson = (await meRes.json()) as { id?: string; username?: string };
      accountId = meJson.id ?? accountId;
      accountHandle = meJson.username ? `@${meJson.username}` : null;
    }
  } catch {
    // Non-fatal
  }

  await upsertPlatformConnection({
    ownerKey: owner.ownerKey,
    platform: 'threads',
    accessToken: finalToken,
    expiresAt,
    accountId,
    accountHandle,
  });

  const res = NextResponse.redirect(new URL('/app/setup?tab=publishing&connected=threads', origin));
  res.cookies.delete('asterisk_threads_oauth');
  return res;
}
