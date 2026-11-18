import { NextResponse } from 'next/server';
import { getPlatformConnection, upsertPlatformConnection } from '@/lib/oauth-connections';
import { resolveWorkspaceOwner } from '@/lib/workspace-store';

interface MetaPageItem {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: { id: string; username?: string } | null;
}

export async function POST(req: Request) {
  const owner = await resolveWorkspaceOwner();
  if (!owner.ok) {
    return NextResponse.json({ error: owner.error }, { status: owner.status });
  }

  const body = (await req.json().catch(() => ({}))) as { pageId?: string };
  const pageId = String(body.pageId || '').trim();
  if (!pageId) {
    return NextResponse.json({ error: 'Missing pageId' }, { status: 400 });
  }

  const fbConn = await getPlatformConnection(owner.ownerKey, 'facebook');
  const pages = (fbConn?.meta?.pages as MetaPageItem[] | undefined) ?? [];
  const chosen = pages.find((p) => p.id === pageId);
  if (!chosen) {
    return NextResponse.json({ error: 'Page not found in authorized pages' }, { status: 404 });
  }

  await upsertPlatformConnection({
    ownerKey: owner.ownerKey,
    platform: 'facebook',
    accessToken: chosen.access_token,
    accountId: chosen.id,
    accountHandle: chosen.name,
    meta: fbConn?.meta ?? null,
  });

  if (chosen.instagram_business_account?.id) {
    await upsertPlatformConnection({
      ownerKey: owner.ownerKey,
      platform: 'instagram',
      accessToken: chosen.access_token,
      accountId: chosen.instagram_business_account.id,
      accountHandle: chosen.instagram_business_account.username
        ? `@${chosen.instagram_business_account.username}`
        : chosen.name,
    });
  }

  return NextResponse.json({
    ok: true,
    pageName: chosen.name,
    instagramHandle: chosen.instagram_business_account?.username
      ? `@${chosen.instagram_business_account.username}`
      : null,
  });
}
