import { NextResponse } from 'next/server';
import { upsertPlatformConnection } from '@/lib/oauth-connections';
import { resolveWorkspaceOwner } from '@/lib/workspace-store';

const BECH32_CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';

function bech32Polymod(values: number[]): number {
  const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  let chk = 1;
  for (const v of values) {
    const b = chk >> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ v;
    for (let i = 0; i < 5; i++) {
      if ((b >> i) & 1) chk ^= GEN[i];
    }
  }
  return chk;
}

function hexToNpub(hex: string): string {
  const bytes = Buffer.from(hex, 'hex');
  const words: number[] = [];
  let acc = 0;
  let bits = 0;
  for (const byte of bytes) {
    acc = (acc << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      words.push((acc >> bits) & 31);
    }
  }
  if (bits > 0) words.push((acc << (5 - bits)) & 31);
  const hrpExpand = [3, 3, 3, 3, 0, 14, 16, 21, 2]; // 'npub'
  const polymod = bech32Polymod([...hrpExpand, ...words, 0, 0, 0, 0, 0, 0]) ^ 1;
  const checksum = Array.from({ length: 6 }, (_, i) => (polymod >> (5 * (5 - i))) & 31);
  return 'npub1' + [...words, ...checksum].map((d) => BECH32_CHARSET[d]).join('');
}

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

  const npub = hexToNpub(pubkey);
  const shortHandle = body.name?.trim() || `${npub.slice(0, 12)}…${npub.slice(-6)}`;
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
