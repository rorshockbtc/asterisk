#!/usr/bin/env node
/**
 * Art pipeline for asterisk watercolor plates.
 *
 * Usage: node scripts/process-art.mjs <manifest.json>
 * Manifest: [{ "src": "/abs/path.jpg", "name": "hero-sky", "kind": "plate" | "layer", "widths": [2400, 1200] }]
 *
 * - "layer" images (painted on white paper) are leveled to #FFF and given a smooth
 *   alpha channel (keying out white paper while preserving soft watercolor edges),
 *   so they never paint a white box inside CSS transform/stacking contexts.
 * - "plate" images only level when bare paper is genuinely visible (≥ 238).
 * - Outputs WebP at each width into public/art/: <name>.webp (largest) and <name>-<w>.webp.
 */
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const OUT_DIR = path.resolve(process.cwd(), 'public/art');

async function paperWhitePoint(img) {
  const { data, info } = await img.clone().greyscale().raw().toBuffer({ resolveWithObject: true });
  const hist = new Uint32Array(256);
  for (let i = 0; i < data.length; i += info.channels) hist[data[i]]++;
  const target = (data.length / info.channels) * 0.02;
  let acc = 0;
  for (let v = 255; v >= 0; v--) {
    acc += hist[v];
    if (acc >= target) return Math.max(v, 200);
  }
  return 250;
}

async function applyPaperAlpha(rgbImg) {
  const { data, info } = await rgbImg.clone().raw().toBuffer({ resolveWithObject: true });
  const rgba = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0, j = 0; i < data.length; i += 3, j += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const minC = Math.min(r, g, b);
    // Pure white paper (minC >= 248) -> 0 alpha; soft washes fade smoothly; ink -> 255.
    const alpha = minC >= 248 ? 0 : Math.min(255, Math.round((248 - minC) * 5.5));
    rgba[j] = r;
    rgba[j + 1] = g;
    rgba[j + 2] = b;
    rgba[j + 3] = alpha;
  }
  return sharp(rgba, {
    raw: { width: info.width, height: info.height, channels: 4 },
  });
}

async function processEntry({ src, name, kind = 'plate', widths = [2400, 1200], crop = 0 }) {
  let input = sharp(await readFile(src)).removeAlpha();
  if (crop > 0) {
    const meta = await input.metadata();
    const dx = Math.round(meta.width * crop);
    const dy = Math.round(meta.height * crop);
    input = sharp(
      await input
        .extract({ left: dx, top: dy, width: meta.width - dx * 2, height: meta.height - dy * 2 })
        .toBuffer()
    );
  }
  const white = await paperWhitePoint(input);
  const target = kind === 'layer' ? 255 : white >= 238 ? 250 : white;
  const gain = target / white;
  const leveled = input.linear([gain, gain, gain], [0, 0, 0]);
  const prepared = kind === 'layer' ? await applyPaperAlpha(leveled) : leveled;
  const sorted = [...widths].sort((a, b) => b - a);

  for (const [i, w] of sorted.entries()) {
    const file = i === 0 ? `${name}.webp` : `${name}-${w}.webp`;
    await prepared
      .clone()
      .resize({ width: w, withoutEnlargement: true })
      .webp({ quality: kind === 'layer' ? 88 : 82, alphaQuality: 90, effort: 5 })
      .toFile(path.join(OUT_DIR, file));
    console.log(`✓ ${file}  (${kind}, paper ${white} → ${target})`);
  }
}

const manifestPath = process.argv[2];
if (!manifestPath) {
  console.error('Usage: node scripts/process-art.mjs <manifest.json>');
  process.exit(1);
}
await mkdir(OUT_DIR, { recursive: true });
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
for (const entry of manifest) await processEntry(entry);
