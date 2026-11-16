import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { PLATFORM_ORDER, type PlatformId } from '@/lib/platforms';
import { dispatchVariant } from '@/lib/publishers';

export async function POST(req: Request) {
  try {
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

    const db = getDb();
    db.prepare(`
      INSERT INTO variants (broadcast_id, platform, body_text, reply_text, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(broadcast_id, platform) DO UPDATE SET
        body_text = excluded.body_text,
        reply_text = excluded.reply_text,
        updated_at = CURRENT_TIMESTAMP
    `).run(broadcastId, platform, bodyText, replyText);

    const result = await dispatchVariant({ platform, bodyText, replyText, mode });

    if (result.ok) {
      db.prepare(`
        UPDATE variants
        SET status = ?,
            external_url = COALESCE(NULLIF(?, ''), external_url),
            published_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE broadcast_id = ? AND platform = ?
      `).run(mode === 'api' ? 'published' : 'copied', result.externalUrl || '', broadcastId, platform);
    }

    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Publish failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
