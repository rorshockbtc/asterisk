import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import {
  computeCadenceStatus,
  PLATFORM_ORDER,
  PLATFORM_SPECS,
  type PlatformId,
} from '@/lib/platforms';
import { getApiConnectionStatus } from '@/lib/publishers';

interface VariantInput {
  platform: PlatformId;
  body_text: string;
  reply_text?: string;
}

export async function GET() {
  try {
    const db = getDb();

    const broadcasts = db
      .prepare(`SELECT * FROM broadcasts ORDER BY updated_at DESC, id DESC LIMIT 40`)
      .all() as Array<{
      id: number;
      title: string;
      brand: string;
      seed_text: string;
      media_note: string;
      created_at: string;
      updated_at: string;
    }>;

    const allVariants = db
      .prepare(`SELECT * FROM variants ORDER BY id ASC`)
      .all() as Array<{
      id: number;
      broadcast_id: number;
      platform: PlatformId;
      body_text: string;
      reply_text: string;
      status: string;
      external_url: string;
      published_at: string | null;
      updated_at: string;
    }>;

    const enriched = broadcasts.map((b) => ({
      ...b,
      variants: allVariants.filter((v) => v.broadcast_id === b.id),
    }));

    const settingsRows = db
      .prepare(`SELECT * FROM platform_settings`)
      .all() as Array<{ platform: PlatformId; handle: string; cadence_days: number }>;

    const settingsMap = Object.fromEntries(settingsRows.map((r) => [r.platform, r]));

    const cadence = PLATFORM_ORDER.map((platform) => {
      const lastRow = db
        .prepare(
          `SELECT published_at FROM variants WHERE platform = ? AND published_at IS NOT NULL ORDER BY published_at DESC LIMIT 1`
        )
        .get(platform) as { published_at: string } | undefined;

      const targetDays = settingsMap[platform]?.cadence_days || PLATFORM_SPECS[platform].cadenceDefaultDays;
      return computeCadenceStatus(platform, lastRow?.published_at || null, targetDays);
    });

    const setupChecklist = db
      .prepare(`SELECT * FROM setup_checklist ORDER BY sort_order ASC, id ASC`)
      .all();

    return NextResponse.json({
      broadcasts: enriched,
      cadence,
      setupChecklist,
      platformSettings: settingsRows,
      apiStatus: getApiConnectionStatus(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load studio';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      id?: number;
      title?: string;
      brand?: string;
      seed_text?: string;
      media_note?: string;
      variants?: VariantInput[];
    };

    const title = String(body.title || '').trim() || 'Untitled Note';
    const brand = String(body.brand || 'CHB Studio').trim();
    const seedText = String(body.seed_text || '').trim();
    const mediaNote = String(body.media_note || '').trim();
    const variants = Array.isArray(body.variants) ? body.variants : [];

    const db = getDb();
    let broadcastId = Number(body.id || 0);

    if (broadcastId > 0) {
      db.prepare(
        `UPDATE broadcasts
         SET title = ?, brand = ?, seed_text = ?, media_note = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      ).run(title, brand, seedText, mediaNote, broadcastId);
    } else {
      const info = db
        .prepare(`INSERT INTO broadcasts (title, brand, seed_text, media_note) VALUES (?, ?, ?, ?)`)
        .run(title, brand, seedText, mediaNote);
      broadcastId = Number(info.lastInsertRowid);
    }

    const upsertVariant = db.prepare(`
      INSERT INTO variants (broadcast_id, platform, body_text, reply_text, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(broadcast_id, platform) DO UPDATE SET
        body_text = excluded.body_text,
        reply_text = excluded.reply_text,
        updated_at = CURRENT_TIMESTAMP
    `);

    for (const v of variants) {
      if (!PLATFORM_ORDER.includes(v.platform)) continue;
      upsertVariant.run(broadcastId, v.platform, String(v.body_text || ''), String(v.reply_text || ''));
    }

    return NextResponse.json({ success: true, id: broadcastId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save broadcast';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get('id') || 0);
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const db = getDb();
    db.prepare(`DELETE FROM broadcasts WHERE id = ?`).run(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete broadcast';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
