import { NextResponse } from 'next/server';
import { upsertPlatformConnection } from '@/lib/oauth-connections';
import { resolveWorkspaceOwner } from '@/lib/workspace-store';

export async function POST(req: Request) {
  const owner = await resolveWorkspaceOwner();
  if (!owner.ok) {
    return NextResponse.json({ error: owner.error }, { status: owner.status });
  }

  const body = (await req.json().catch(() => ({}))) as {
    pubkey?: string;
    name?: string;
    picture?: string;
  };
  const pubkey = String(body.pubkey || '').trim();
  if (!/^[0-9a-f]{64}$/i.test(pubkey)) {
    return NextResponse.json({ error: 'Invalid Nostr hex pubkey' }, { status: 400 });
  }

  const shortHandle = body.name?.trim() || `${pubkey.slice(0, 8)}…${pubkey.slice(-6)}`;
  await upsertPlatformConnection({
    ownerKey: owner.ownerKey,
    platform: 'nostr',
    accessToken: pubkey,
    accountId: pubkey,
    accountHandle: shortHandle,
    meta: body.picture ? { picture: body.picture } : null,
  });

  return NextResponse.json({ ok: true, pubkey, handle: shortHandle });
}
