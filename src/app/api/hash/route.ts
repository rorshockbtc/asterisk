import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { isNeonConfigured, validateClerkMember } from '@/lib/clerk-auth';
import { getDb } from '@/lib/db';
import { MAX_MEDIA_IMAGES, PLATFORM_ORDER, type MediaAttachment, type PlatformId } from '@/lib/platforms';

interface VariantInput {
  platform: PlatformId;
  body_text: string;
  reply_text?: string;
}

/**
 * Hash journal sync route (`hash_entries` in Neon when Clerk + DATABASE_URL are configured,
 * mirrored with local SQLite `broadcasts` + `variants` when running offline/local preview).
 */
export async function GET() {
  try {
    const member = await validateClerkMember();

    if (member.mode === 'clerk' && member.clerkId && isNeonConfigured()) {
      const sql = neon(process.env.DATABASE_URL!);
      const entries = await sql`
        SELECT id, title, content AS "seedText", tags, photo_urls AS "photoUrls", updated_at AS "updatedAt"
        FROM hash_entries
        WHERE clerk_id = ${member.clerkId}
        ORDER BY updated_at DESC
        LIMIT 40
      `;
      return NextResponse.json({
        ok: true,
        stub: false,
        source: 'hash',
        entries,
      });
    }

    const db = getDb();
    const rows = db
      .prepare(
        `SELECT id, title, brand AS topic, seed_text AS seedText, media_note AS mediaNote, updated_at AS updatedAt
         FROM broadcasts ORDER BY updated_at DESC, id DESC LIMIT 40`
      )
      .all();

    return NextResponse.json({
      ok: true,
      stub: true,
      source: 'hash',
      entries: rows,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load Hash entries';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      id?: number;
      hashEntryId?: string;
      title?: string;
      topic?: string;
      brand?: string;
      seedText?: string;
      seed_text?: string;
      mediaNote?: string;
      media_note?: string;
      media_attachments?: MediaAttachment[];
      variants?: VariantInput[];
    };

    const title = String(body.title || '').trim() || 'Untitled Note';
    const topic = String(body.topic || body.brand || 'Build Log').trim();
    const seedText = String(body.seedText ?? body.seed_text ?? '').trim();
    const mediaNote = String(body.mediaNote ?? body.media_note ?? '').trim();
    const mediaAttachments = Array.isArray(body.media_attachments)
      ? body.media_attachments.slice(0, MAX_MEDIA_IMAGES)
      : [];
    const mediaJson = JSON.stringify(mediaAttachments);
    const photoUrls = mediaAttachments
      .map((m) => m.url)
      .filter((u) => typeof u === 'string' && u.length > 0 && u.length < 300000);
    const variants = Array.isArray(body.variants) ? body.variants : [];

    // Mirror locally in SQLite so workspace draft state always remains fast and cohesive
    const db = getDb();
    let broadcastId = Number(body.id || 0);

    if (broadcastId > 0) {
      db.prepare(
        `UPDATE broadcasts
         SET title = ?, brand = ?, seed_text = ?, media_note = ?, media_json = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      ).run(title, topic, seedText, mediaNote, mediaJson, broadcastId);
    } else {
      const info = db
        .prepare(
          `INSERT INTO broadcasts (title, brand, seed_text, media_note, media_json) VALUES (?, ?, ?, ?, ?)`
        )
        .run(title, topic, seedText, mediaNote, mediaJson);
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
      upsertVariant.run(
        broadcastId,
        v.platform,
        String(v.body_text || ''),
        String(v.reply_text || '')
      );
    }

    // Write straight into Neon `hash_entries` when Clerk + DATABASE_URL are configured
    const member = await validateClerkMember();
    if (member.mode === 'clerk' && member.clerkId && isNeonConfigured()) {
      const sql = neon(process.env.DATABASE_URL!);
      const hashEntryId = body.hashEntryId || crypto.randomUUID();
      const tags = [topic.toLowerCase().replace(/[^a-z0-9]+/g, '-'), 'asterisk'];
      const fullContent = mediaNote ? `${seedText}\n\nMedia note: ${mediaNote}` : seedText;

      await sql`
        INSERT INTO hash_entries (id, clerk_id, title, content, writing_mode, is_private, tags, photo_urls)
        VALUES (
          ${hashEntryId},
          ${member.clerkId},
          ${title},
          ${fullContent},
          'quick',
          true,
          ${JSON.stringify(tags)}::json,
          ${JSON.stringify(photoUrls)}::json
        )
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          content = EXCLUDED.content,
          tags = EXCLUDED.tags,
          photo_urls = EXCLUDED.photo_urls,
          updated_at = NOW()
      `;

      return NextResponse.json({
        ok: true,
        stub: false,
        target: 'hash',
        id: broadcastId,
        hashEntryId,
        message: 'Saved to Hash.',
      });
    }

    return NextResponse.json({
      ok: true,
      stub: true,
      target: 'hash',
      id: broadcastId,
      message: 'Saved to Hash (local preview).',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save to Hash';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
