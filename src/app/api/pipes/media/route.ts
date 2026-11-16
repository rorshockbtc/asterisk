import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { isNeonConfigured, validateClerkMember } from '@/lib/clerk-auth';
import type { MediaAttachment } from '@/lib/platforms';

function svgCardDataUrl(
  width: number,
  height: number,
  kicker: string,
  headline: string,
  accentHex: string,
  bgTop: string,
  bgBottom: string
): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${bgTop}"/>
        <stop offset="100%" stop-color="${bgBottom}"/>
      </linearGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#g)"/>
    <circle cx="${Math.round(width * 0.78)}" cy="${Math.round(height * 0.28)}" r="${Math.round(Math.min(width, height) * 0.24)}" fill="${accentHex}" fill-opacity="0.22"/>
    <text x="${Math.round(width * 0.08)}" y="${Math.round(height * 0.22)}" font-family="system-ui, -apple-system, sans-serif" font-size="${Math.round(Math.min(width, height) * 0.04)}" font-weight="700" letter-spacing="2" fill="${accentHex}">${kicker}</text>
    <text x="${Math.round(width * 0.08)}" y="${Math.round(height * 0.56)}" font-family="Georgia, serif" font-size="${Math.round(Math.min(width, height) * 0.09)}" font-style="italic" fill="#111827">${headline}</text>
    <line x1="${Math.round(width * 0.08)}" y1="${Math.round(height * 0.78)}" x2="${Math.round(width * 0.92)}" y2="${Math.round(height * 0.78)}" stroke="#111827" stroke-opacity="0.18" stroke-width="2"/>
    <text x="${Math.round(width * 0.08)}" y="${Math.round(height * 0.86)}" font-family="system-ui, -apple-system, sans-serif" font-size="${Math.round(Math.min(width, height) * 0.036)}" font-weight="600" fill="#4B5563">pipes.pink · asterisk</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const SAMPLE_PIPE_MEDIA: MediaAttachment[] = [
  {
    id: 'pipe-thesis-1',
    name: 'Thesis Edition Plate (4:5)',
    url: svgCardDataUrl(800, 1000, 'THESIS EDITION · 4:5', 'Calm Typography', '#FE299E', '#FAF8F5', '#F7B9C9'),
    width: 800,
    height: 1000,
    source: 'pipe',
    pipeName: 'Thesis',
  },
  {
    id: 'pipe-marigold-1',
    name: 'Marigold Chart Card (16:9)',
    url: svgCardDataUrl(1280, 720, 'MARIGOLD · 16:9', 'Signal Over Noise', '#0284C7', '#FAF8F5', '#A9D3EA'),
    width: 1280,
    height: 720,
    source: 'pipe',
    pipeName: 'Marigold',
  },
  {
    id: 'pipe-hash-1',
    name: 'Hash Monograph Card (4:5)',
    url: svgCardDataUrl(800, 1000, 'HASH JOURNAL · 4:5', 'Unedited Field Note', '#6D28D9', '#FAF8F5', '#E9D5FF'),
    width: 800,
    height: 1000,
    source: 'pipe',
    pipeName: 'Hash',
  },
  {
    id: 'pipe-greater-1',
    name: 'Greater Field Square (1:1)',
    url: svgCardDataUrl(900, 900, 'GREATER · 1:1', 'One Voice, Six Rooms', '#B81468', '#FAF8F5', '#FAD6B8'),
    width: 900,
    height: 900,
    source: 'pipe',
    pipeName: 'Greater',
  },
];

/**
 * Fetches visual assets ready to pull from Pipes / Hash into an asterisk broadcast.
 * Queries Neon `hash_entries.photo_urls` and public `nodes.payload` images when DATABASE_URL is configured,
 * supplemented by crisp built-in Pipe visual templates for instant local & onboarding testing.
 */
export async function GET() {
  const items: MediaAttachment[] = [];

  try {
    if (isNeonConfigured()) {
      const member = await validateClerkMember();
      const sql = neon(process.env.DATABASE_URL!);
      if (member.clerkId) {
        const hashRows = (await sql`
          SELECT id, title, photo_urls AS "photoUrls"
          FROM hash_entries
          WHERE clerk_id = ${member.clerkId}
          ORDER BY updated_at DESC
          LIMIT 8
        `) as Array<{ id: string; title: string; photoUrls: string[] | null }>;

        for (const row of hashRows) {
          const urls = Array.isArray(row.photoUrls) ? row.photoUrls : [];
          for (const [idx, url] of urls.entries()) {
            if (typeof url === 'string' && url.startsWith('http')) {
              items.push({
                id: `hash-${row.id}-${idx}`,
                name: `${row.title || 'Hash Note'} #${idx + 1}`,
                url,
                width: 1200,
                height: 900,
                source: 'pipe',
                pipeName: 'Hash',
              });
            }
          }
        }
      }

      const nodeRows = (await sql`
        SELECT id, source_title AS "sourceTitle", payload->>'imageUrl' AS "imageUrl"
        FROM nodes
        WHERE status = 'active' AND payload ? 'imageUrl'
        ORDER BY created_at DESC
        LIMIT 8
      `) as Array<{ id: string; sourceTitle: string | null; imageUrl: string | null }>;

      for (const n of nodeRows) {
        if (n.imageUrl && n.imageUrl.startsWith('http')) {
          items.push({
            id: `node-${n.id}`,
            name: n.sourceTitle || 'Pipes Node Visual',
            url: n.imageUrl,
            width: 1200,
            height: 675,
            source: 'pipe',
            pipeName: 'Pipes',
          });
        }
      }
    }
  } catch (err) {
    console.warn('[asterisk] Optional Neon pipe media lookup skipped:', err);
  }

  // Always include ready-to-attach sample Pipe cards if live DB returned fewer than 4
  for (const sample of SAMPLE_PIPE_MEDIA) {
    if (items.length >= 8) break;
    if (!items.some((x) => x.id === sample.id)) {
      items.push(sample);
    }
  }

  return NextResponse.json({
    ok: true,
    items,
  });
}
