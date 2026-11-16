import { neon } from '@neondatabase/serverless';
import { isClerkConfigured, isNeonConfigured, validateClerkMember } from '@/lib/clerk-auth';
import { getDb } from '@/lib/db';
import {
  computeCadenceStatus,
  MAX_MEDIA_IMAGES,
  PLATFORM_GUIDES,
  PLATFORM_ORDER,
  PLATFORM_SPECS,
  type MediaAttachment,
  type PlatformId,
} from '@/lib/platforms';

export interface VariantInput {
  platform: PlatformId;
  body_text: string;
  reply_text?: string;
}

export interface BroadcastRecord {
  id: number;
  title: string;
  brand: string;
  seed_text: string;
  media_note: string;
  media_attachments: MediaAttachment[];
  created_at: string;
  updated_at: string;
  variants: Array<{
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
}

export interface WorkspacePayload {
  broadcasts: BroadcastRecord[];
  cadence: ReturnType<typeof computeCadenceStatus>[];
  setupChecklist: Array<{
    id: number;
    platform: string;
    step_key: string;
    label: string;
    detail: string;
    completed: number;
    sort_order: number;
  }>;
  platformSettings: Array<{ platform: PlatformId; handle: string; cadence_days: number }>;
}

export async function resolveWorkspaceOwner(): Promise<
  { ok: true; ownerKey: string } | { ok: false; status: 401; error: string }
> {
  if (!isClerkConfigured()) {
    return { ok: true, ownerKey: 'local' };
  }
  const member = await validateClerkMember();
  if (!member.authenticated || !member.clerkId) {
    return { ok: false, status: 401, error: 'Sign in to use asterisk.' };
  }
  return { ok: true, ownerKey: member.clerkId };
}

function safeParseMediaJson(raw: string | null | undefined): MediaAttachment[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as MediaAttachment[]).slice(0, MAX_MEDIA_IMAGES) : [];
  } catch {
    return [];
  }
}

function toIsoStringOrNull(val: unknown): string | null {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString();
  const str = String(val);
  const parsed = new Date(str);
  return Number.isNaN(parsed.getTime()) ? str : parsed.toISOString();
}

function toIsoString(val: unknown): string {
  return toIsoStringOrNull(val) || new Date().toISOString();
}

let neonSchemaPromise: Promise<void> | null = null;

type NeonSql = ReturnType<typeof getNeonSql>;

async function ensureNeonSchema(sql: NeonSql) {
  if (!neonSchemaPromise) {
    neonSchemaPromise = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS asterisk_broadcasts (
          id SERIAL PRIMARY KEY,
          clerk_id TEXT NOT NULL DEFAULT 'local',
          title TEXT NOT NULL,
          brand TEXT NOT NULL DEFAULT 'Build Log',
          seed_text TEXT NOT NULL DEFAULT '',
          media_note TEXT NOT NULL DEFAULT '',
          media_json TEXT NOT NULL DEFAULT '[]',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS idx_asterisk_broadcasts_clerk
        ON asterisk_broadcasts (clerk_id, updated_at DESC, id DESC)
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS asterisk_variants (
          id SERIAL PRIMARY KEY,
          broadcast_id INTEGER NOT NULL REFERENCES asterisk_broadcasts(id) ON DELETE CASCADE,
          platform TEXT NOT NULL,
          body_text TEXT NOT NULL DEFAULT '',
          reply_text TEXT NOT NULL DEFAULT '',
          status TEXT NOT NULL DEFAULT 'draft',
          external_url TEXT NOT NULL DEFAULT '',
          published_at TIMESTAMPTZ,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE (broadcast_id, platform)
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS asterisk_setup_checklist (
          id SERIAL PRIMARY KEY,
          clerk_id TEXT NOT NULL DEFAULT 'local',
          platform TEXT NOT NULL,
          step_key TEXT NOT NULL,
          label TEXT NOT NULL,
          detail TEXT NOT NULL,
          completed INTEGER NOT NULL DEFAULT 0,
          sort_order INTEGER NOT NULL DEFAULT 0,
          UNIQUE (clerk_id, step_key)
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS asterisk_platform_settings (
          clerk_id TEXT NOT NULL DEFAULT 'local',
          platform TEXT NOT NULL,
          handle TEXT NOT NULL DEFAULT '',
          cadence_days INTEGER NOT NULL DEFAULT 4,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          PRIMARY KEY (clerk_id, platform)
        )
      `;
    })().catch((err) => {
      neonSchemaPromise = null;
      throw err;
    });
  }
  await neonSchemaPromise;
}

async function ensureNeonUserDefaults(sql: NeonSql, ownerKey: string) {
  await ensureNeonSchema(sql);

  const existingSettings = (await sql`
    SELECT COUNT(*)::int AS cnt FROM asterisk_platform_settings WHERE clerk_id = ${ownerKey}
  `) as Array<{ cnt: number }>;

  if ((existingSettings[0]?.cnt ?? 0) < PLATFORM_ORDER.length) {
    for (const platform of PLATFORM_ORDER) {
      await sql`
        INSERT INTO asterisk_platform_settings (clerk_id, platform, handle, cadence_days)
        VALUES (${ownerKey}, ${platform}, '', ${PLATFORM_SPECS[platform].cadenceDefaultDays})
        ON CONFLICT (clerk_id, platform) DO NOTHING
      `;
    }
  }

  const expectedSteps = PLATFORM_ORDER.reduce(
    (sum, p) => sum + PLATFORM_GUIDES[p].setupSteps.length,
    0
  );
  const existingSteps = (await sql`
    SELECT COUNT(*)::int AS cnt FROM asterisk_setup_checklist WHERE clerk_id = ${ownerKey}
  `) as Array<{ cnt: number }>;

  if ((existingSteps[0]?.cnt ?? 0) !== expectedSteps) {
    const activeKeys: string[] = [];
    let sortOrder = 1;
    for (const platform of PLATFORM_ORDER) {
      const guide = PLATFORM_GUIDES[platform];
      for (const step of guide.setupSteps) {
        activeKeys.push(step.key);
        await sql`
          INSERT INTO asterisk_setup_checklist (clerk_id, platform, step_key, label, detail, sort_order)
          VALUES (${ownerKey}, ${platform}, ${step.key}, ${step.label}, ${step.detail}, ${sortOrder++})
          ON CONFLICT (clerk_id, step_key) DO UPDATE SET
            platform = EXCLUDED.platform,
            label = EXCLUDED.label,
            detail = EXCLUDED.detail,
            sort_order = EXCLUDED.sort_order
        `;
      }
    }
    if (activeKeys.length > 0) {
      await sql`
        DELETE FROM asterisk_setup_checklist
        WHERE clerk_id = ${ownerKey} AND NOT (step_key = ANY(${activeKeys}))
      `;
    }
  }
}

function getNeonSql() {
  return neon(process.env.DATABASE_URL!);
}

export async function loadWorkspace(ownerKey: string): Promise<WorkspacePayload> {
  if (isNeonConfigured()) {
    const sql = getNeonSql();
    await ensureNeonUserDefaults(sql, ownerKey);

    const broadcasts = (await sql`
      SELECT id, title, brand, seed_text, media_note, media_json, created_at, updated_at
      FROM asterisk_broadcasts
      WHERE clerk_id = ${ownerKey}
      ORDER BY updated_at DESC, id DESC
      LIMIT 40
    `) as Array<{
      id: number;
      title: string;
      brand: string;
      seed_text: string;
      media_note: string;
      media_json: string;
      created_at: unknown;
      updated_at: unknown;
    }>;

    const broadcastIds = broadcasts.map((b) => b.id);
    const allVariants =
      broadcastIds.length > 0
        ? ((await sql`
            SELECT id, broadcast_id, platform, body_text, reply_text, status, external_url, published_at, updated_at
            FROM asterisk_variants
            WHERE broadcast_id = ANY(${broadcastIds})
            ORDER BY id ASC
          `) as Array<{
            id: number;
            broadcast_id: number;
            platform: PlatformId;
            body_text: string;
            reply_text: string;
            status: string;
            external_url: string;
            published_at: unknown;
            updated_at: unknown;
          }>)
        : [];

    const enriched: BroadcastRecord[] = broadcasts.map((b) => ({
      id: b.id,
      title: b.title,
      brand: b.brand,
      seed_text: b.seed_text,
      media_note: b.media_note,
      media_attachments: safeParseMediaJson(b.media_json),
      created_at: toIsoString(b.created_at),
      updated_at: toIsoString(b.updated_at),
      variants: allVariants
        .filter((v) => v.broadcast_id === b.id)
        .map((v) => ({
          id: v.id,
          broadcast_id: v.broadcast_id,
          platform: v.platform,
          body_text: v.body_text,
          reply_text: v.reply_text,
          status: v.status,
          external_url: v.external_url,
          published_at: toIsoStringOrNull(v.published_at),
          updated_at: toIsoString(v.updated_at),
        })),
    }));

    const settingsRows = (await sql`
      SELECT platform, handle, cadence_days
      FROM asterisk_platform_settings
      WHERE clerk_id = ${ownerKey}
    `) as Array<{ platform: PlatformId; handle: string; cadence_days: number }>;

    const settingsMap = Object.fromEntries(settingsRows.map((r) => [r.platform, r]));

    const lastPublishedRows = (await sql`
      SELECT v.platform, MAX(v.published_at) AS published_at
      FROM asterisk_variants v
      JOIN asterisk_broadcasts b ON b.id = v.broadcast_id
      WHERE b.clerk_id = ${ownerKey} AND v.published_at IS NOT NULL
      GROUP BY v.platform
    `) as Array<{ platform: PlatformId; published_at: unknown }>;
    const lastMap = Object.fromEntries(
      lastPublishedRows.map((r) => [r.platform, toIsoStringOrNull(r.published_at)])
    );

    const cadence = PLATFORM_ORDER.map((platform) => {
      const targetDays =
        settingsMap[platform]?.cadence_days || PLATFORM_SPECS[platform].cadenceDefaultDays;
      return computeCadenceStatus(platform, lastMap[platform] || null, targetDays);
    });

    const setupChecklist = (await sql`
      SELECT id, platform, step_key, label, detail, completed, sort_order
      FROM asterisk_setup_checklist
      WHERE clerk_id = ${ownerKey}
      ORDER BY sort_order ASC, id ASC
    `) as WorkspacePayload['setupChecklist'];

    return {
      broadcasts: enriched,
      cadence,
      setupChecklist,
      platformSettings: settingsRows,
    };
  }

  const db = getDb();
  const broadcasts = db
    .prepare(`SELECT * FROM broadcasts ORDER BY updated_at DESC, id DESC LIMIT 40`)
    .all() as Array<{
    id: number;
    title: string;
    brand: string;
    seed_text: string;
    media_note: string;
    media_json?: string;
    created_at: string;
    updated_at: string;
  }>;

  const allVariants = db
    .prepare(`SELECT * FROM variants ORDER BY id ASC`)
    .all() as BroadcastRecord['variants'];

  const enriched: BroadcastRecord[] = broadcasts.map((b) => ({
    ...b,
    media_attachments: safeParseMediaJson(b.media_json),
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

    const targetDays =
      settingsMap[platform]?.cadence_days || PLATFORM_SPECS[platform].cadenceDefaultDays;
    return computeCadenceStatus(platform, lastRow?.published_at || null, targetDays);
  });

  const setupChecklist = db
    .prepare(`SELECT * FROM setup_checklist ORDER BY sort_order ASC, id ASC`)
    .all() as WorkspacePayload['setupChecklist'];

  return {
    broadcasts: enriched,
    cadence,
    setupChecklist,
    platformSettings: settingsRows,
  };
}

export async function saveBroadcast(
  ownerKey: string,
  input: {
    id?: number;
    title: string;
    brand: string;
    seedText: string;
    mediaNote: string;
    mediaJson: string;
    variants: VariantInput[];
  }
): Promise<number> {
  if (isNeonConfigured()) {
    const sql = getNeonSql();
    await ensureNeonSchema(sql);

    let broadcastId = Number(input.id || 0);
    if (broadcastId > 0) {
      const updated = (await sql`
        UPDATE asterisk_broadcasts
        SET title = ${input.title},
            brand = ${input.brand},
            seed_text = ${input.seedText},
            media_note = ${input.mediaNote},
            media_json = ${input.mediaJson},
            updated_at = NOW()
        WHERE id = ${broadcastId} AND clerk_id = ${ownerKey}
        RETURNING id
      `) as Array<{ id: number }>;

      if (updated.length === 0) {
        broadcastId = 0;
      }
    }

    if (broadcastId <= 0) {
      const inserted = (await sql`
        INSERT INTO asterisk_broadcasts (clerk_id, title, brand, seed_text, media_note, media_json)
        VALUES (${ownerKey}, ${input.title}, ${input.brand}, ${input.seedText}, ${input.mediaNote}, ${input.mediaJson})
        RETURNING id
      `) as Array<{ id: number }>;
      broadcastId = inserted[0].id;
    }

    for (const v of input.variants) {
      if (!PLATFORM_ORDER.includes(v.platform)) continue;
      await sql`
        INSERT INTO asterisk_variants (broadcast_id, platform, body_text, reply_text, updated_at)
        VALUES (${broadcastId}, ${v.platform}, ${String(v.body_text || '')}, ${String(v.reply_text || '')}, NOW())
        ON CONFLICT (broadcast_id, platform) DO UPDATE SET
          body_text = EXCLUDED.body_text,
          reply_text = EXCLUDED.reply_text,
          updated_at = NOW()
      `;
    }

    return broadcastId;
  }

  const db = getDb();
  let broadcastId = Number(input.id || 0);

  if (broadcastId > 0) {
    db.prepare(
      `UPDATE broadcasts
       SET title = ?, brand = ?, seed_text = ?, media_note = ?, media_json = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(input.title, input.brand, input.seedText, input.mediaNote, input.mediaJson, broadcastId);
  } else {
    const info = db
      .prepare(
        `INSERT INTO broadcasts (title, brand, seed_text, media_note, media_json) VALUES (?, ?, ?, ?, ?)`
      )
      .run(input.title, input.brand, input.seedText, input.mediaNote, input.mediaJson);
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

  for (const v of input.variants) {
    if (!PLATFORM_ORDER.includes(v.platform)) continue;
    upsertVariant.run(
      broadcastId,
      v.platform,
      String(v.body_text || ''),
      String(v.reply_text || '')
    );
  }

  return broadcastId;
}

export async function deleteBroadcast(ownerKey: string, id: number): Promise<void> {
  if (isNeonConfigured()) {
    const sql = getNeonSql();
    await ensureNeonSchema(sql);
    await sql`DELETE FROM asterisk_broadcasts WHERE id = ${id} AND clerk_id = ${ownerKey}`;
    return;
  }

  const db = getDb();
  db.prepare(`DELETE FROM broadcasts WHERE id = ?`).run(id);
}

export async function toggleSetupStep(
  ownerKey: string,
  stepKey: string,
  completed: boolean
): Promise<void> {
  const value = completed ? 1 : 0;
  if (isNeonConfigured()) {
    const sql = getNeonSql();
    await ensureNeonUserDefaults(sql, ownerKey);
    await sql`
      UPDATE asterisk_setup_checklist
      SET completed = ${value}
      WHERE clerk_id = ${ownerKey} AND step_key = ${stepKey}
    `;
    return;
  }

  const db = getDb();
  db.prepare(`UPDATE setup_checklist SET completed = ? WHERE step_key = ?`).run(value, stepKey);
}

export async function updatePlatformSetting(
  ownerKey: string,
  platform: PlatformId,
  handle: string,
  cadenceDays: number
): Promise<void> {
  if (isNeonConfigured()) {
    const sql = getNeonSql();
    await ensureNeonUserDefaults(sql, ownerKey);
    await sql`
      UPDATE asterisk_platform_settings
      SET handle = ${handle}, cadence_days = ${cadenceDays}, updated_at = NOW()
      WHERE clerk_id = ${ownerKey} AND platform = ${platform}
    `;
    return;
  }

  const db = getDb();
  db.prepare(`
    UPDATE platform_settings
    SET handle = ?, cadence_days = ?, updated_at = CURRENT_TIMESTAMP
    WHERE platform = ?
  `).run(handle, cadenceDays, platform);
}

export async function upsertVariantForPublish(
  ownerKey: string,
  broadcastId: number,
  platform: PlatformId,
  bodyText: string,
  replyText: string
): Promise<boolean> {
  if (isNeonConfigured()) {
    const sql = getNeonSql();
    await ensureNeonSchema(sql);
    const owned = (await sql`
      SELECT id FROM asterisk_broadcasts WHERE id = ${broadcastId} AND clerk_id = ${ownerKey} LIMIT 1
    `) as Array<{ id: number }>;
    if (owned.length === 0) return false;

    await sql`
      INSERT INTO asterisk_variants (broadcast_id, platform, body_text, reply_text, updated_at)
      VALUES (${broadcastId}, ${platform}, ${bodyText}, ${replyText}, NOW())
      ON CONFLICT (broadcast_id, platform) DO UPDATE SET
        body_text = EXCLUDED.body_text,
        reply_text = EXCLUDED.reply_text,
        updated_at = NOW()
    `;
    return true;
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
  return true;
}

export async function markVariantPublished(
  broadcastId: number,
  platform: PlatformId,
  status: 'published' | 'copied',
  externalUrl: string
): Promise<void> {
  if (isNeonConfigured()) {
    const sql = getNeonSql();
    await sql`
      UPDATE asterisk_variants
      SET status = ${status},
          external_url = COALESCE(NULLIF(${externalUrl}, ''), external_url),
          published_at = NOW(),
          updated_at = NOW()
      WHERE broadcast_id = ${broadcastId} AND platform = ${platform}
    `;
    return;
  }

  const db = getDb();
  db.prepare(`
    UPDATE variants
    SET status = ?,
        external_url = COALESCE(NULLIF(?, ''), external_url),
        published_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE broadcast_id = ? AND platform = ?
  `).run(status, externalUrl, broadcastId, platform);
}
