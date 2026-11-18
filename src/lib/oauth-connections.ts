import crypto from 'node:crypto';
import { neon } from '@neondatabase/serverless';
import type { PlatformId } from './platforms';

export type OAuthPlatform = Extract<PlatformId, 'threads' | 'x' | 'facebook' | 'instagram'> | 'nostr';

export interface PlatformConnectionRecord {
  owner_key: string;
  platform: OAuthPlatform;
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
  account_id: string | null;
  account_handle: string | null;
  meta: Record<string, unknown> | null;
  updated_at: string;
}

export interface PublicPlatformConnection {
  platform: OAuthPlatform;
  connected: boolean;
  accountHandle: string | null;
  accountId: string | null;
  expiresAt: string | null;
  updatedAt: string | null;
  picture?: string | null;
  pages?: Array<{ id: string; name: string; instagramHandle?: string | null }>;
}

function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not configured');
  return neon(url);
}

function getEncryptionKey(): Buffer {
  const raw =
    process.env.ASTERISK_TOKEN_SECRET ||
    process.env.CLERK_SECRET_KEY ||
    'asterisk-local-dev-token-key';
  return crypto.createHash('sha256').update(raw).digest();
}

export function encryptToken(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
}

export function decryptToken(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split('.');
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error('Invalid encrypted token format');
  }
  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(ivB64, 'base64url')
  );
  decipher.setAuthTag(Buffer.from(tagB64, 'base64url'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64url')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

let tableEnsured = false;

export async function ensureConnectionsTable(): Promise<void> {
  if (tableEnsured) return;
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS platform_connections (
      owner_key TEXT NOT NULL,
      platform TEXT NOT NULL,
      access_token_enc TEXT NOT NULL,
      refresh_token_enc TEXT,
      expires_at TIMESTAMPTZ,
      account_id TEXT,
      account_handle TEXT,
      meta_json JSONB,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (owner_key, platform)
    )
  `;
  tableEnsured = true;
}

export async function upsertPlatformConnection(input: {
  ownerKey: string;
  platform: OAuthPlatform;
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: string | null;
  accountId?: string | null;
  accountHandle?: string | null;
  meta?: Record<string, unknown> | null;
}): Promise<void> {
  await ensureConnectionsTable();
  const sql = getSql();
  const accessEnc = encryptToken(input.accessToken);
  const refreshEnc = input.refreshToken ? encryptToken(input.refreshToken) : null;
  const metaStr = input.meta ? JSON.stringify(input.meta) : null;

  await sql`
    INSERT INTO platform_connections (
      owner_key,
      platform,
      access_token_enc,
      refresh_token_enc,
      expires_at,
      account_id,
      account_handle,
      meta_json,
      updated_at
    )
    VALUES (
      ${input.ownerKey},
      ${input.platform},
      ${accessEnc},
      ${refreshEnc},
      ${input.expiresAt ?? null},
      ${input.accountId ?? null},
      ${input.accountHandle ?? null},
      ${metaStr}::jsonb,
      NOW()
    )
    ON CONFLICT (owner_key, platform)
    DO UPDATE SET
      access_token_enc = EXCLUDED.access_token_enc,
      refresh_token_enc = COALESCE(EXCLUDED.refresh_token_enc, platform_connections.refresh_token_enc),
      expires_at = EXCLUDED.expires_at,
      account_id = EXCLUDED.account_id,
      account_handle = EXCLUDED.account_handle,
      meta_json = EXCLUDED.meta_json,
      updated_at = NOW()
  `;
}

export async function getPlatformConnection(
  ownerKey: string,
  platform: OAuthPlatform
): Promise<PlatformConnectionRecord | null> {
  if (!process.env.DATABASE_URL) return null;
  await ensureConnectionsTable();
  const sql = getSql();
  const rows = (await sql`
    SELECT
      owner_key,
      platform,
      access_token_enc,
      refresh_token_enc,
      expires_at,
      account_id,
      account_handle,
      meta_json,
      updated_at
    FROM platform_connections
    WHERE owner_key = ${ownerKey} AND platform = ${platform}
    LIMIT 1
  `) as Array<{
    owner_key: string;
    platform: OAuthPlatform;
    access_token_enc: string;
    refresh_token_enc: string | null;
    expires_at: string | null;
    account_id: string | null;
    account_handle: string | null;
    meta_json: Record<string, unknown> | null;
    updated_at: string;
  }>;

  const row = rows[0];
  if (!row) return null;

  return {
    owner_key: row.owner_key,
    platform: row.platform,
    access_token: decryptToken(row.access_token_enc),
    refresh_token: row.refresh_token_enc ? decryptToken(row.refresh_token_enc) : null,
    expires_at: row.expires_at,
    account_id: row.account_id,
    account_handle: row.account_handle,
    meta: row.meta_json,
    updated_at: row.updated_at,
  };
}

export async function listPlatformConnections(
  ownerKey: string
): Promise<Record<OAuthPlatform, PublicPlatformConnection>> {
  const empty: Record<OAuthPlatform, PublicPlatformConnection> = {
    threads: { platform: 'threads', connected: false, accountHandle: null, accountId: null, expiresAt: null, updatedAt: null },
    x: { platform: 'x', connected: false, accountHandle: null, accountId: null, expiresAt: null, updatedAt: null },
    facebook: { platform: 'facebook', connected: false, accountHandle: null, accountId: null, expiresAt: null, updatedAt: null },
    instagram: { platform: 'instagram', connected: false, accountHandle: null, accountId: null, expiresAt: null, updatedAt: null },
    nostr: { platform: 'nostr', connected: false, accountHandle: null, accountId: null, expiresAt: null, updatedAt: null },
  };

  if (!process.env.DATABASE_URL) return empty;
  await ensureConnectionsTable();
  const sql = getSql();
  const rows = (await sql`
    SELECT platform, account_handle, account_id, expires_at, updated_at, meta_json
    FROM platform_connections
    WHERE owner_key = ${ownerKey}
  `) as Array<{
    platform: OAuthPlatform;
    account_handle: string | null;
    account_id: string | null;
    expires_at: string | null;
    updated_at: string;
    meta_json: {
      picture?: string;
      pages?: Array<{
        id: string;
        name: string;
        instagram_business_account?: { id: string; username?: string } | null;
      }>;
    } | null;
  }>;

  for (const row of rows) {
    if (empty[row.platform]) {
      empty[row.platform] = {
        platform: row.platform,
        connected: true,
        accountHandle: row.account_handle,
        accountId: row.account_id,
        expiresAt: row.expires_at,
        updatedAt: row.updated_at,
        picture: row.meta_json?.picture ?? null,
        pages: row.meta_json?.pages?.map((p) => ({
          id: p.id,
          name: p.name,
          instagramHandle: p.instagram_business_account?.username
            ? `@${p.instagram_business_account.username}`
            : null,
        })),
      };
    }
  }
  return empty;
}

export async function deletePlatformConnection(
  ownerKey: string,
  platform: OAuthPlatform
): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  await ensureConnectionsTable();
  const sql = getSql();
  await sql`
    DELETE FROM platform_connections
    WHERE owner_key = ${ownerKey} AND platform = ${platform}
  `;
}
