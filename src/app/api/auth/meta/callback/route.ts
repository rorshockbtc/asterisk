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
      new URL(`/app/setup?tab=publishing&oauth_error=${encodeURIComponent(errorParam || 'meta_denied')}`, origin)
    );
  }

  const cookieStore = await cookies();
  const savedState = cookieStore.get('asterisk_meta_oauth')?.value;
  if (!savedState || savedState !== state) {
    return NextResponse.redirect(
      new URL('/app/setup?tab=publishing&oauth_error=meta_state_mismatch', origin)
    );
  }

  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) {
    return NextResponse.redirect(
      new URL('/app/setup?tab=publishing&oauth_error=missing_meta_app_credentials', origin)
    );
  }

  const redirectUri = `${origin}/api/auth/meta/callback`;
  const tokenUrl = new URL('https://graph.facebook.com/v21.0/oauth/access_token');
  tokenUrl.searchParams.set('client_id', appId);
  tokenUrl.searchParams.set('client_secret', appSecret);
  tokenUrl.searchParams.set('redirect_uri', redirectUri);
  tokenUrl.searchParams.set('code', code);

  const tokenRes = await fetch(tokenUrl.toString());
  const tokenJson = (await tokenRes.json()) as {
    access_token?: string;
    error?: { message?: string };
  };

  if (!tokenRes.ok || !tokenJson.access_token) {
    return NextResponse.redirect(
      new URL(
        `/app/setup?tab=publishing&oauth_error=${encodeURIComponent(tokenJson.error?.message || 'meta_token_failed')}`,
        origin
      )
    );
  }

  // Fetch managed Facebook Pages + linked Instagram Business/Creator accounts
  const pagesRes = await fetch(
    `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&access_token=${encodeURIComponent(tokenJson.access_token)}`
  );
  const pagesJson = (await pagesRes.json()) as {
    data?: Array<{
      id: string;
      name: string;
      access_token: string;
      instagram_business_account?: { id: string; username?: string };
    }>;
  };

  const pages = pagesJson.data ?? [];
  const firstPage = pages[0];
  if (!firstPage) {
    return NextResponse.redirect(
      new URL('/app/setup?tab=publishing&oauth_error=no_facebook_page_found', origin)
    );
  }

  const igPage = pages.find((p) => p.instagram_business_account?.id);

  await upsertPlatformConnection({
    ownerKey: owner.ownerKey,
    platform: 'facebook',
    accessToken: firstPage.access_token,
    accountId: firstPage.id,
    accountHandle: firstPage.name,
  });

  if (igPage?.instagram_business_account?.id) {
    await upsertPlatformConnection({
      ownerKey: owner.ownerKey,
      platform: 'instagram',
      accessToken: igPage.access_token,
      accountId: igPage.instagram_business_account.id,
      accountHandle: igPage.instagram_business_account.username
        ? `@${igPage.instagram_business_account.username}`
        : igPage.name,
    });
  }

  const res = NextResponse.redirect(new URL('/app/setup?tab=publishing&connected=meta', origin));
  res.cookies.delete('asterisk_meta_oauth');
  return res;
}
