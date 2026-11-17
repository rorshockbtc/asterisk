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
      new URL(`/app/setup?tab=publishing&oauth_error=${encodeURIComponent(errorParam || 'x_denied')}`, origin)
    );
  }

  const cookieStore = await cookies();
  const rawCookie = cookieStore.get('asterisk_x_oauth')?.value;
  if (!rawCookie) {
    return NextResponse.redirect(
      new URL('/app/setup?tab=publishing&oauth_error=x_state_expired', origin)
    );
  }

  let saved: { state: string; codeVerifier: string };
  try {
    saved = JSON.parse(rawCookie);
  } catch {
    return NextResponse.redirect(
      new URL('/app/setup?tab=publishing&oauth_error=x_state_invalid', origin)
    );
  }

  if (saved.state !== state) {
    return NextResponse.redirect(
      new URL('/app/setup?tab=publishing&oauth_error=x_state_mismatch', origin)
    );
  }

  const clientId = process.env.X_CLIENT_ID;
  const clientSecret = process.env.X_CLIENT_SECRET;
  if (!clientId) {
    return NextResponse.redirect(
      new URL('/app/setup?tab=publishing&oauth_error=missing_x_client_id', origin)
    );
  }

  const redirectUri = `${origin}/api/auth/x/callback`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };
  if (clientSecret) {
    headers.Authorization = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;
  }

  const tokenRes = await fetch('https://api.twitter.com/2/oauth2/token', {
    method: 'POST',
    headers,
    body: new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      client_id: clientId,
      redirect_uri: redirectUri,
      code_verifier: saved.codeVerifier,
    }),
  });

  const tokenJson = (await tokenRes.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error_description?: string;
  };

  if (!tokenRes.ok || !tokenJson.access_token) {
    return NextResponse.redirect(
      new URL(
        `/app/setup?tab=publishing&oauth_error=${encodeURIComponent(tokenJson.error_description || 'x_token_failed')}`,
        origin
      )
    );
  }

  let accountId: string | null = null;
  let accountHandle: string | null = null;
  try {
    const meRes = await fetch('https://api.twitter.com/2/users/me', {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    });
    if (meRes.ok) {
      const meJson = (await meRes.json()) as { data?: { id?: string; username?: string } };
      accountId = meJson.data?.id ?? null;
      accountHandle = meJson.data?.username ? `@${meJson.data.username}` : null;
    }
  } catch {
    // Non-fatal; token still works
  }

  const expiresAt = tokenJson.expires_in
    ? new Date(Date.now() + tokenJson.expires_in * 1000).toISOString()
    : null;

  await upsertPlatformConnection({
    ownerKey: owner.ownerKey,
    platform: 'x',
    accessToken: tokenJson.access_token,
    refreshToken: tokenJson.refresh_token ?? null,
    expiresAt,
    accountId,
    accountHandle,
  });

  const res = NextResponse.redirect(new URL('/app/setup?tab=publishing&connected=x', origin));
  res.cookies.delete('asterisk_x_oauth');
  return res;
}
