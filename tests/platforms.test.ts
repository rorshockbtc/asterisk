import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import {
  adaptSeedToPlatform,
  analyzeDraftForPlatform,
  computeCadenceStatus,
  countWords,
  extractLinksForThreadsReply,
  formatAspectBadge,
  MAX_MEDIA_IMAGES,
  PLATFORM_GUIDES,
  PLATFORM_ORDER,
  PLATFORM_SPECS,
  splitIntoXThread,
  type MediaAttachment,
} from '../src/lib/platforms.ts';
import { readinessToWeather } from '../src/lib/weather.ts';
import {
  PIPES_DESK_URL,
  PIPES_DIRECT_SIGNIN_URL,
  PIPES_HASH_URL,
  PIPES_SIGNUP_URL,
  safeNextPath,
} from '../src/lib/session.ts';
import { adaptInboundFromPipes } from '../src/lib/pipes-client.ts';

test('PLATFORM_ORDER covers all 6 channels with TikTok in preliminary test mode', () => {
  assert.deepEqual(PLATFORM_ORDER, [
    'threads',
    'x',
    'facebook',
    'substack',
    'instagram',
    'tiktok',
  ]);
  assert.equal(PLATFORM_SPECS.threads.tier, 'primary');
  assert.equal(PLATFORM_SPECS.x.tier, 'primary');
  assert.equal(PLATFORM_SPECS.tiktok.tier, 'test');
  assert.equal(MAX_MEDIA_IMAGES, 4);
});

test('splitIntoXThread preserves single posts under 280 chars and splits long notes cleanly', () => {
  const short = 'Shipped a calm multi-platform studio without nested cards.';
  assert.deepEqual(splitIntoXThread(short), [short]);

  const longNote = Array.from(
    { length: 18 },
    (_, i) => `Sentence ${i + 1} explains concrete product progress.`
  ).join(' ');
  const thread = splitIntoXThread(longNote, 280);
  assert.ok(thread.length >= 3);
  for (const t of thread) {
    assert.ok(t.length <= 280, `Post exceeded 280 chars (${t.length})`);
  }
  assert.match(thread[0], /\(1\/\d+\)$/);
});

test('extractLinksForThreadsReply and adaptSeedToPlatform keep Threads & Facebook main copy link-free', () => {
  const raw = 'We simplified our drafting workspace to hairline pedestals.\n\nTry it here: https://example.com/app';
  const res = extractLinksForThreadsReply(raw);
  assert.equal(res.mainText, 'We simplified our drafting workspace to hairline pedestals.\n\nTry it here:');
  assert.equal(res.replyText, 'Link: https://example.com/app');

  const threadsAdapted = adaptSeedToPlatform('threads', raw);
  assert.equal(threadsAdapted.bodyText, res.mainText);
  assert.equal(threadsAdapted.replyText, 'Link: https://example.com/app');

  const fbAdapted = adaptSeedToPlatform('facebook', raw);
  assert.equal(fbAdapted.bodyText, res.mainText);
  assert.equal(fbAdapted.replyText, 'Link: https://example.com/app');

  const longSeed = `${'word '.repeat(50)}https://example.com/demo`;
  const tiktokAdapted = adaptSeedToPlatform('tiktok', longSeed);
  assert.ok(tiktokAdapted.bodyText.length <= 150);
  assert.doesNotMatch(tiktokAdapted.bodyText, /https?:\/\//);
});

test('analyzeDraftForPlatform flags Threads link throttling and clears once moved to self-reply', () => {
  const withUrl = analyzeDraftForPlatform(
    'threads',
    'Removed every nested card in our editor today. Have you tried hairline layouts yet? https://example.com/post',
    '',
    ''
  );
  assert.equal(withUrl.readiness, 'fix');
  const linkCheck = withUrl.checks.find((c) => c.id === 'links');
  assert.equal(linkCheck?.status, 'warn');
  assert.equal(linkCheck?.fixAction, 'move_url_to_reply');

  const clean = analyzeDraftForPlatform(
    'threads',
    'Removed every nested card in our editor today. How do you keep workspace UIs calm?',
    'Link: https://example.com/post',
    'UI screenshot'
  );
  assert.equal(clean.readiness, 'ready');
});

test('analyzeDraftForPlatform validates up-to-4 image attachments and Instagram aspect ratios', () => {
  const portraitImg: MediaAttachment = {
    id: 'img-1',
    name: 'plate.png',
    url: 'data:image/png;base64,AA==',
    width: 800,
    height: 1000,
    source: 'pipe',
    pipeName: 'Thesis',
  };
  const landscapeImg: MediaAttachment = {
    id: 'img-2',
    name: 'screen.png',
    url: 'data:image/png;base64,AA==',
    width: 1280,
    height: 720,
    source: 'upload',
  };

  assert.equal(formatAspectBadge(portraitImg.width, portraitImg.height), '4:5');
  assert.equal(formatAspectBadge(landscapeImg.width, landscapeImg.height), '16:9');
  assert.equal(formatAspectBadge(900, 900), '1:1');
  assert.equal(countWords('Say it once.   Let it travel!'), 6);
  assert.equal(countWords('   '), 0);

  const igPass = analyzeDraftForPlatform(
    'instagram',
    'Calm typography across every surface.',
    '',
    '',
    [portraitImg]
  );
  assert.equal(igPass.checks.find((c) => c.id === 'media')?.status, 'pass');

  const igWideWarn = analyzeDraftForPlatform(
    'instagram',
    'Calm typography across every surface.',
    '',
    '',
    [landscapeImg]
  );
  assert.equal(igWideWarn.checks.find((c) => c.id === 'media')?.status, 'warn');

  const tooMany = analyzeDraftForPlatform(
    'x',
    'Clean 1-to-4 image post grid.',
    '',
    '',
    [portraitImg, portraitImg, portraitImg, portraitImg, portraitImg]
  );
  assert.equal(tooMany.checks.find((c) => c.id === 'media')?.status, 'warn');
});

test('analyzeDraftForPlatform gives tailored warnings for IG media, TikTok 16:9 test mode, X threads, and hashtags', () => {
  const igMissing = analyzeDraftForPlatform('instagram', 'Clean typography without card clutter.', '', '');
  assert.equal(igMissing.readiness, 'fix');
  assert.equal(igMissing.checks.find((c) => c.id === 'media')?.status, 'warn');

  const ig16x9 = analyzeDraftForPlatform(
    'instagram',
    'Clean typography without card clutter across all devices.',
    '',
    '16:9 desktop demo recording'
  );
  assert.equal(ig16x9.checks.find((c) => c.id === 'media')?.status, 'warn');

  const tiktok16x9 = analyzeDraftForPlatform('tiktok', 'Watch how fast this layout renders.', '', '16:9 clip');
  assert.equal(tiktok16x9.checks.find((c) => c.id === 'media')?.status, 'warn');

  const xThread = analyzeDraftForPlatform('x', 'word '.repeat(90), '', 'Screenshot');
  assert.equal(xThread.checks.find((c) => c.id === 'length')?.status, 'info');

  const substackLink = analyzeDraftForPlatform(
    'substack',
    'We wrote up every friction point from dogfooding our design system in production: https://example.com/report',
    '',
    ''
  );
  assert.equal(substackLink.checks.find((c) => c.id === 'links')?.status, 'pass');

  const spamTags = analyzeDraftForPlatform(
    'x',
    'Launching today #buildinpublic #saas #design #indiehacker',
    '',
    ''
  );
  assert.equal(spamTags.checks.find((c) => c.id === 'resonance')?.status, 'warn');
});

test('computeCadenceStatus flags never-posted, fresh, due, and overdue channels accurately', () => {
  const now = new Date('2026-11-16T15:00:00Z');
  assert.equal(computeCadenceStatus('threads', null, 4, now).state, 'never');
  assert.equal(computeCadenceStatus('x', '2026-11-16 10:00:00', 3, now).state, 'fresh');
  assert.equal(computeCadenceStatus('threads', '2026-11-12 10:00:00', 4, now).state, 'due');
  assert.equal(computeCadenceStatus('instagram', '2026-11-01 10:00:00', 5, now).state, 'overdue');
});

test('open-source hygiene: PLATFORM_GUIDES contains zero hardcoded personal handles or private projects', () => {
  const serialized = JSON.stringify(PLATFORM_GUIDES);
  assert.doesNotMatch(serialized, /rorshockbtc|Custodia|HighDraw|Walmart|Optum/i);
});

test('readinessToWeather maps all four readiness levels to calm weather states', () => {
  assert.equal(readinessToWeather('empty'), 'paper');
  assert.equal(readinessToWeather('fix'), 'overcast');
  assert.equal(readinessToWeather('tune'), 'dawn');
  assert.equal(readinessToWeather('ready'), 'clear');
});

test('safeNextPath rejects open-redirect URLs and keeps safe same-origin routes defaulting to /app', () => {
  assert.equal(safeNextPath('/app/rooms'), '/app/rooms');
  assert.equal(safeNextPath('https://evil.com/phish'), '/app');
  assert.equal(safeNextPath('//evil.com'), '/app');
  assert.equal(safeNextPath('/\\evil.com'), '/app');
  assert.equal(safeNextPath(null), '/app');
});

test('all 5 OpenGraph PNG social cards + apple touch icon exist on disk', () => {
  const root = process.cwd();
  for (const name of ['og-home.png', 'og-colophon.png', 'og-login.png', 'og-rooms.png', 'og-app.png']) {
    const p = join(root, 'public', 'og', name);
    assert.ok(existsSync(p), `Missing OG PNG: ${p}`);
    assert.ok(statSync(p).size > 15_000, `Suspiciously small OG image: ${p}`);
  }
  assert.ok(existsSync(join(root, 'public', 'apple-touch-icon.png')));
});

test('Pipes bridge constants preserve ref=asterisk and adaptInboundFromPipes protects Threads/FB from link throttling', () => {
  assert.match(PIPES_SIGNUP_URL, /\/asterisk\?ref=asterisk$/);
  assert.match(PIPES_DIRECT_SIGNIN_URL, /\/sign-in\?ref=asterisk$/);
  assert.match(PIPES_DESK_URL, /\/my-pipes$/);
  assert.match(PIPES_HASH_URL, /\/write$/);

  const inbound = adaptInboundFromPipes({
    draft: 'Threshold and Sanctuary — via pipe\\website-design',
    sourceTitle: 'Threshold and Sanctuary',
    sourceUrl: 'https://pipes.pink/explore/website-design',
  });

  assert.equal(inbound.title, 'Threshold and Sanctuary');
  assert.doesNotMatch(inbound.variants.threads.body_text, /https?:\/\//);
  assert.equal(inbound.variants.threads.reply_text, 'Link: https://pipes.pink/explore/website-design');
  assert.doesNotMatch(inbound.variants.facebook.body_text, /https?:\/\//);
  assert.equal(inbound.variants.facebook.reply_text, 'Link: https://pipes.pink/explore/website-design');
  assert.match(inbound.variants.substack.body_text, /https:\/\/pipes\.pink\/explore\/website-design/);
  assert.match(inbound.variants.x.body_text, /https:\/\/pipes\.pink\/explore\/website-design/);

  // Ensure outbound Pipes links preserve Referer (no rel="noreferrer" on PIPES_* links)
  for (const file of [
    'src/components/site/LoginDoor.tsx',
    'src/components/site/SiteFooter.tsx',
    'src/components/studio/NotesDrawer.tsx',
    'src/components/studio/StudioShell.tsx',
  ]) {
    const src = readFileSync(join(process.cwd(), file), 'utf8');
    assert.doesNotMatch(src, /PIPES_[\s\S]{0,160}noreferrer/);
  }
});
