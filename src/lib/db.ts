import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { PLATFORM_GUIDES, PLATFORM_ORDER, PLATFORM_SPECS, type PlatformId } from './platforms';

let cachedDb: Database.Database | null = null;

function resolveDbPath(): string {
  if (process.env.ASTERISK_DB_PATH) {
    return process.env.ASTERISK_DB_PATH;
  }
  if (process.env.VERCEL === '1') {
    return '/tmp/asterisk.db';
  }
  return join(process.cwd(), 'data', 'asterisk.db');
}

export function getDb(): Database.Database {
  if (cachedDb) return cachedDb;

  const dbPath = resolveDbPath();
  if (dbPath !== ':memory:') {
    const dir = dirname(dbPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  initSchema(db);
  cachedDb = db;
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS broadcasts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      brand TEXT NOT NULL DEFAULT 'Build Log',
      seed_text TEXT NOT NULL DEFAULT '',
      media_note TEXT DEFAULT '',
      media_json TEXT NOT NULL DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS variants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      broadcast_id INTEGER NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
      platform TEXT NOT NULL,
      body_text TEXT NOT NULL DEFAULT '',
      reply_text TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'draft',
      external_url TEXT DEFAULT '',
      published_at DATETIME,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(broadcast_id, platform)
    );

    CREATE TABLE IF NOT EXISTS setup_checklist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT NOT NULL,
      step_key TEXT NOT NULL UNIQUE,
      label TEXT NOT NULL,
      detail TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS platform_settings (
      platform TEXT PRIMARY KEY,
      handle TEXT NOT NULL DEFAULT '',
      cadence_days INTEGER NOT NULL DEFAULT 4,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Idempotent migration for existing local SQLite databases missing `media_json`
  const cols = db.prepare(`PRAGMA table_info(broadcasts)`).all() as Array<{ name: string }>;
  if (!cols.some((c) => c.name === 'media_json')) {
    db.exec(`ALTER TABLE broadcasts ADD COLUMN media_json TEXT NOT NULL DEFAULT '[]'`);
  }

  const insertSetting = db.prepare(`
    INSERT OR IGNORE INTO platform_settings (platform, handle, cadence_days)
    VALUES (?, ?, ?)
  `);
  for (const platform of PLATFORM_ORDER) {
    insertSetting.run(platform, '', PLATFORM_SPECS[platform].cadenceDefaultDays);
  }

  const upsertStep = db.prepare(`
    INSERT INTO setup_checklist (platform, step_key, label, detail, sort_order)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(step_key) DO UPDATE SET
      platform = excluded.platform,
      label = excluded.label,
      detail = excluded.detail,
      sort_order = excluded.sort_order
  `);

  const activeKeys: string[] = [];
  let sortOrder = 1;
  for (const platform of PLATFORM_ORDER) {
    const guide = PLATFORM_GUIDES[platform as PlatformId];
    for (const step of guide.setupSteps) {
      activeKeys.push(step.key);
      upsertStep.run(platform, step.key, step.label, step.detail, sortOrder++);
    }
  }

  if (activeKeys.length > 0) {
    const placeholders = activeKeys.map(() => '?').join(', ');
    db.prepare(`DELETE FROM setup_checklist WHERE step_key NOT IN (${placeholders})`).run(
      ...activeKeys
    );
  }
}
