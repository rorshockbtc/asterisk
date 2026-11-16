#!/usr/bin/env node
/**
 * Generate crisp 1200x630 PNG OpenGraph cards + 180x180 Apple touch icon for asterisk (*).
 * PNG ensures compatibility across LinkedIn, X/Twitter, Facebook, Threads, Substack, and Slack.
 *
 * Usage: node scripts/generate-og.mjs
 */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const ART_DIR = path.join(ROOT, 'public/art');
const OG_DIR = path.join(ROOT, 'public/og');
const PUBLIC_DIR = path.join(ROOT, 'public');

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const CARDS = [
  {
    out: 'og-home.png',
    bg: 'hero-dawn.webp',
    eyebrow: 'SAY IT ONCE · SIX ROOMS',
    titleLine1: 'Say it once.',
    titleLine2: 'Let it travel.',
    subtitle: 'Tune one honest thought for Threads, X, Facebook, Substack, IG & TikTok.',
    darkText: true,
  },
  {
    out: 'og-colophon.png',
    bg: 'panorama-horizon.webp',
    eyebrow: 'COLOPHON & ART DIRECTION',
    titleLine1: 'Print is the sans-serif.',
    titleLine2: 'Watercolor is the serif.',
    subtitle: 'Fourteen artists weighed; Jean-Michel Folon chosen alongside Guy Billout.',
    darkText: true,
  },
  {
    out: 'og-login.png',
    bg: 'scene-door.webp',
    eyebrow: 'ACCOUNT DOOR · PIPES ECOSYSTEM',
    titleLine1: 'Step inside',
    titleLine2: 'asterisk (*)',
    subtitle: 'Private composing studio synced with Hash and six-channel rhythm.',
    darkText: true,
  },
  {
    out: 'og-rooms.png',
    bg: 'room-threads.webp',
    eyebrow: 'SIX ROOMS · CHANNEL ARCHITECTURE',
    titleLine1: 'Every room has',
    titleLine2: 'its own weather.',
    subtitle: 'Link rules, sweet-spot length, and native framing calibrated per audience.',
    darkText: false,
  },
  {
    out: 'og-app.png',
    bg: 'scene-open-window.webp',
    eyebrow: 'ASTERISK APP · WRITE ONCE',
    titleLine1: 'One thought.',
    titleLine2: 'Six tailored drafts.',
    subtitle: 'Up to 4 images, Hash archive sync, self-reply protection & calm weather.',
    darkText: true,
  },
];

await mkdir(OG_DIR, { recursive: true });

for (const card of CARDS) {
  const bgPath = path.join(ART_DIR, card.bg);
  const ink = card.darkText ? '#111827' : '#FAF8F5';
  const muted = card.darkText ? '#4B5563' : '#E5E7EB';
  const bgGradStart = card.darkText ? 'rgba(250,248,245,0.92)' : 'rgba(17,24,39,0.84)';
  const bgGradMid = card.darkText ? 'rgba(250,248,245,0.72)' : 'rgba(17,24,39,0.58)';
  const bgGradEnd = card.darkText ? 'rgba(250,248,245,0.18)' : 'rgba(17,24,39,0.18)';

  const overlaySvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
      <defs>
        <linearGradient id="wash" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="${bgGradStart}" />
          <stop offset="56%" stop-color="${bgGradMid}" />
          <stop offset="100%" stop-color="${bgGradEnd}" />
        </linearGradient>
      </defs>

      <rect width="1200" height="630" fill="url(#wash)" />

      <!-- Brand header -->
      <text x="72" y="92" font-family="system-ui, -apple-system, 'Helvetica Neue', Arial, sans-serif" font-size="34" font-weight="800" letter-spacing="-1.2" fill="${ink}">
        asterisk
      </text>
      <text x="206" y="95" font-family="system-ui, -apple-system, 'Helvetica Neue', Arial, sans-serif" font-size="40" font-weight="800" fill="#FE299E">
        *
      </text>

      <!-- Eyebrow -->
      <text x="72" y="198" font-family="system-ui, -apple-system, 'Helvetica Neue', Arial, sans-serif" font-size="18" font-weight="700" letter-spacing="2.6" fill="#FE299E">
        ${escapeXml(card.eyebrow)}
      </text>

      <!-- Headline -->
      <text x="72" y="294" font-family="system-ui, -apple-system, 'Helvetica Neue', Arial, sans-serif" font-size="78" font-weight="800" letter-spacing="-2.5" fill="${ink}">
        ${escapeXml(card.titleLine1)}
      </text>
      <text x="72" y="382" font-family="Georgia, 'Times New Roman', serif" font-size="76" font-style="italic" font-weight="400" letter-spacing="-1.5" fill="${ink}">
        ${escapeXml(card.titleLine2)}
      </text>

      <!-- Subtitle -->
      <text x="72" y="458" font-family="system-ui, -apple-system, 'Helvetica Neue', Arial, sans-serif" font-size="24" font-weight="500" fill="${muted}">
        ${escapeXml(card.subtitle)}
      </text>

      <!-- Footer hairline + attribution -->
      <line x1="72" y1="538" x2="1128" y2="538" stroke="${ink}" stroke-opacity="0.16" stroke-width="1.5" />
      <text x="72" y="576" font-family="system-ui, -apple-system, 'Helvetica Neue', Arial, sans-serif" font-size="18" font-weight="600" fill="${muted}">
        asterisk.pipes.pink · Colon Hyphen Bracket
      </text>
    </svg>
  `;

  await sharp(bgPath)
    .resize(1200, 630, { fit: 'cover', position: 'center' })
    .composite([{ input: Buffer.from(overlaySvg), top: 0, left: 0 }])
    .png({ compressionLevel: 9, palette: false })
    .toFile(path.join(OG_DIR, card.out));

  console.log(`✓ public/og/${card.out} (1200x630 PNG)`);
}

// Generate 180x180 Apple touch icon
const touchSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180">
    <rect width="180" height="180" fill="#FAF8F5" />
    <g stroke="#FE299E" stroke-width="16" stroke-linecap="round">
      <line x1="90" y1="36" x2="90" y2="144" />
      <line x1="43.2" y1="63" x2="136.8" y2="117" />
      <line x1="136.8" y1="63" x2="43.2" y2="117" />
    </g>
  </svg>
`;
await sharp(Buffer.from(touchSvg)).png().toFile(path.join(PUBLIC_DIR, 'apple-touch-icon.png'));
console.log('✓ public/apple-touch-icon.png (180x180 PNG)');
