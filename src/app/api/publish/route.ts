import { NextResponse } from 'next/server';
import { PLATFORM_ORDER, type PlatformId } from '@/lib/platforms';
import { getPlatformConnection, type OAuthPlatform } from '@/lib/oauth-connections';
import { dispatchVariant } from '@/lib/publishers';
import {
  markVariantPublished,
  resolveWorkspaceOwner,
  upsertVariantForPublish,
} from '@/lib/workspace-store';

export async function POST(req: Request) {
  try {
    const owner = await resolveWorkspaceOwner();
    if (!owner.ok) {
      return NextResponse.json({ error: owner.error }, { status: owner.status });
    }

    const body = (await req.json()) as {
      broadcastId?: number;
      platform?: PlatformId;
      bodyText?: string;
      replyText?: string;
      mode?: 'copy' | 'api';
    };

    const broadcastId = Number(body.broadcastId || 0);
    const platform = body.platform;
    const mode = body.mode === 'api' ? 'api' : 'copy';
    const bodyText = String(body.bodyText || '').trim();
    const replyText = String(body.replyText || '').trim();

    if (!broadcastId || !platform || !PLATFORM_ORDER.includes(platform)) {
      return NextResponse.json({ error: 'Invalid broadcastId or platform' }, { status: 400 });
    }
    if (!bodyText) {
      return NextResponse.json({ error: 'Draft text cannot be empty before publishing.' }, { status: 400 });
    }

    const owned = await upsertVariantForPublish(
      owner.ownerKey,
      broadcastId,
      platform,
      bodyText,
      replyText
    );
    if (!owned) {
      return NextResponse.json({ error: 'Broadcast not found' }, { status: 404 });
    }

    const oauthPlatforms: OAuthPlatform[] = ['threads', 'x', 'facebook', 'instagram'];
    const connection =
      mode === 'api' && oauthPlatforms.includes(platform as OAuthPlatform)
        ? await getPlatformConnection(owner.ownerKey, platform as OAuthPlatform)
        : null;

    const result = await dispatchVariant({
      platform,
      bodyText,
      replyText,
      mode,
      connection,
    });

    if (result.ok) {
      await markVariantPublished(
        broadcastId,
        platform,
        mode === 'api' ? 'published' : 'copied',
        result.externalUrl || ''
      );
    }

    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Publish failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
