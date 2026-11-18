import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { resolveWorkspaceOwner } from '@/lib/workspace-store';

function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not configured');
  return neon(url);
}

let profilesTableEnsured = false;

async function ensureProfilesTable() {
  if (profilesTableEnsured) return;
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS publishing_profiles (
      id SERIAL PRIMARY KEY,
      owner_key TEXT NOT NULL,
      name TEXT NOT NULL,
      platforms_json JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  profilesTableEnsured = true;
}

export async function GET() {
  const owner = await resolveWorkspaceOwner();
  if (!owner.ok) {
    return NextResponse.json({ error: owner.error }, { status: owner.status });
  }
  await ensureProfilesTable();
  const sql = getSql();
  const rows = await sql`
    SELECT id, name, platforms_json AS platforms
    FROM publishing_profiles
    WHERE owner_key = ${owner.ownerKey}
    ORDER BY id ASC
  `;
  return NextResponse.json({ profiles: rows });
}

export async function POST(req: Request) {
  const owner = await resolveWorkspaceOwner();
  if (!owner.ok) {
    return NextResponse.json({ error: owner.error }, { status: owner.status });
  }
  await ensureProfilesTable();
  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    platforms?: string[];
  };
  const name = String(body.name || '').trim();
  if (!name) {
    return NextResponse.json({ error: 'Profile name is required' }, { status: 400 });
  }
  const platforms = Array.isArray(body.platforms) ? body.platforms : [];
  const sql = getSql();
  const rows = await sql`
    INSERT INTO publishing_profiles (owner_key, name, platforms_json)
    VALUES (${owner.ownerKey}, ${name}, ${JSON.stringify(platforms)}::jsonb)
    RETURNING id, name, platforms_json AS platforms
  `;
  return NextResponse.json({ profile: rows[0] });
}

export async function DELETE(req: Request) {
  const owner = await resolveWorkspaceOwner();
  if (!owner.ok) {
    return NextResponse.json({ error: owner.error }, { status: owner.status });
  }
  await ensureProfilesTable();
  const id = Number(new URL(req.url).searchParams.get('id') || 0);
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const sql = getSql();
  await sql`
    DELETE FROM publishing_profiles
    WHERE id = ${id} AND owner_key = ${owner.ownerKey}
  `;
  return NextResponse.json({ ok: true });
}
