import { NextResponse } from 'next/server';
import { deletePlatformConnection, type OAuthPlatform } from '@/lib/oauth-connections';
import { resolveWorkspaceOwner } from '@/lib/workspace-store';

const ALLOWED: OAuthPlatform[] = ['threads', 'x', 'facebook', 'instagram'];

export async function POST(req: Request) {
  const owner = await resolveWorkspaceOwner();
  if (!owner.ok) {
    return NextResponse.json({ error: owner.error }, { status: owner.status });
  }

  const body = (await req.json().catch(() => ({}))) as { platform?: OAuthPlatform };
  if (!body.platform || !ALLOWED.includes(body.platform)) {
    return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
  }

  await deletePlatformConnection(owner.ownerKey, body.platform);
  return NextResponse.json({ ok: true, platform: body.platform });
}
