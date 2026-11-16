export type PlatformId =
  | 'threads'
  | 'x'
  | 'facebook'
  | 'substack'
  | 'instagram'
  | 'tiktok';

export const MAX_MEDIA_IMAGES = 4;

export interface MediaAttachment {
  id: string;
  name: string;
  url: string;
  width: number;
  height: number;
  source: 'upload' | 'pipe';
  pipeName?: string;
}

export function countWords(text: string): number {
  const clean = String(text || '').trim();
  if (!clean) return 0;
  return clean.split(/\s+/).length;
}

export function formatAspectBadge(width: number, height: number): string {
  if (!width || !height) return 'photo';
  const ratio = width / height;
  if (Math.abs(ratio - 1) <= 0.08) return '1:1';
  if (Math.abs(ratio - 0.8) <= 0.08) return '4:5';
  if (Math.abs(ratio - 1.777) <= 0.14) return '16:9';
  if (Math.abs(ratio - 0.5625) <= 0.08) return '9:16';
  if (Math.abs(ratio - 1.5) <= 0.1) return '3:2';
  if (Math.abs(ratio - 1.333) <= 0.1) return '4:3';
  return `${width}×${height}`;
}

export type PlatformTier = 'primary' | 'addon' | 'test';

export interface PlatformSpec {
  id: PlatformId;
  name: string;
  shortName: string;
  tier: PlatformTier;
  tierLabel: string;
  charLimit: number;
  sweetSpotMin: number;
  sweetSpotMax: number;
  composeUrl: string;
  mediaRequirement: string;
  desktop16x9Friendly: string;
  linkPolicy: string;
  cadenceDefaultDays: number;
}

export const PLATFORM_ORDER: PlatformId[] = [
  'threads',
  'x',
  'facebook',
  'substack',
  'instagram',
  'tiktok',
];

export const TOPIC_OPTIONS = [
  'Build Log',
  'Product Launch',
  'Field Note',
  'Essay / Dispatch',
] as const;

export const TOPIC_DESCRIPTIONS: Record<(typeof TOPIC_OPTIONS)[number], string> = {
  'Build Log': 'Progress, screenshots & concrete fixes',
  'Product Launch': 'New release or public milestone',
  'Field Note': 'Short craft or design observation',
  'Essay / Dispatch': 'Longer reflection or thesis excerpt',
};

export const PLATFORM_SPECS: Record<PlatformId, PlatformSpec> = {
  threads: {
    id: 'threads',
    name: 'Threads',
    shortName: 'Threads',
    tier: 'primary',
    tierLabel: 'Primary Today',
    charLimit: 500,
    sweetSpotMin: 80,
    sweetSpotMax: 320,
    composeUrl: 'https://www.threads.net/',
    mediaRequirement: 'Text-first (16:9 clips & screenshots work inline)',
    desktop16x9Friendly: 'Yes — landscape clips & screenshots play cleanly',
    linkPolicy: 'Put links in self-reply (main-post links get throttled)',
    cadenceDefaultDays: 3,
  },
  x: {
    id: 'x',
    name: 'X (Twitter)',
    shortName: 'X',
    tier: 'primary',
    tierLabel: 'Primary Today',
    charLimit: 280,
    sweetSpotMin: 90,
    sweetSpotMax: 260,
    composeUrl: 'https://x.com/compose/post',
    mediaRequirement: 'Optional (16:9 UI clips & screenshots perform best)',
    desktop16x9Friendly: 'Yes — native 16:9 video & crisp screenshots',
    linkPolicy: 'Auto-splits >280 chars into a numbered thread',
    cadenceDefaultDays: 2,
  },
  facebook: {
    id: 'facebook',
    name: 'Facebook',
    shortName: 'FB',
    tier: 'addon',
    tierLabel: 'Cross-Post Add-On',
    charLimit: 2200,
    sweetSpotMin: 100,
    sweetSpotMax: 420,
    composeUrl: 'https://www.facebook.com/',
    mediaRequirement: 'Optional (native screenshot or 16:9 demo clip)',
    desktop16x9Friendly: 'Yes — native widescreen upload works cleanly',
    linkPolicy: 'Keep story clean; drop external URL in first comment',
    cadenceDefaultDays: 5,
  },
  substack: {
    id: 'substack',
    name: 'Substack Notes',
    shortName: 'Substack',
    tier: 'addon',
    tierLabel: 'Reader Network',
    charLimit: 1500,
    sweetSpotMin: 120,
    sweetSpotMax: 600,
    composeUrl: 'https://substack.com/notes',
    mediaRequirement: 'Text + optional quote screenshot or 16:9 clip',
    desktop16x9Friendly: 'Yes — native embeds & widescreen clips fit well',
    linkPolicy: 'Direct links encouraged — high-intent reader graph',
    cadenceDefaultDays: 5,
  },
  instagram: {
    id: 'instagram',
    name: 'Instagram',
    shortName: 'IG',
    tier: 'addon',
    tierLabel: 'Visual Portfolio',
    charLimit: 2200,
    sweetSpotMin: 80,
    sweetSpotMax: 350,
    composeUrl: 'https://www.instagram.com/',
    mediaRequirement: 'Required: 4:5 screenshot, carousel, or short Reel',
    desktop16x9Friendly: 'Needs 4:5 or 1:1 framing (pad/crop 16:9 screenshots)',
    linkPolicy: 'No clickable caption URLs — direct readers to bio link',
    cadenceDefaultDays: 6,
  },
  tiktok: {
    id: 'tiktok',
    name: 'TikTok',
    shortName: 'TikTok',
    tier: 'test',
    tierLabel: 'Test Mode',
    charLimit: 2200,
    sweetSpotMin: 35,
    sweetSpotMax: 150,
    composeUrl: 'https://www.tiktok.com/tiktokstudio/upload',
    mediaRequirement: 'Test Mode: requires 9:16 vertical clip when ready',
    desktop16x9Friendly: 'No — desktop 16:9 demos belong on X, Threads & Substack today',
    linkPolicy: 'Caption under 150 chars; zero links in caption',
    cadenceDefaultDays: 7,
  },
};

export interface PlatformSetupStep {
  key: string;
  label: string;
  detail: string;
  whyItMatters: string;
  howToSteps: string[];
  actionUrl?: string;
  actionLabel?: string;
}

export interface PlatformGuide {
  platform: PlatformId;
  headline: string;
  audiencePortrait: string;
  howItWorks: string;
  formatBlueprint: string;
  whatWins: string[];
  avoidList: string[];
  setupSteps: PlatformSetupStep[];
}

export const PLATFORM_GUIDES: Record<PlatformId, PlatformGuide> = {
  threads: {
    platform: 'threads',
    headline: 'Organic discovery engine — reaches far beyond follower count',
    audiencePortrait:
      'Designers, indie makers, tech-curious generalists, and culture commentators scrolling quickly between replies.',
    howItWorks:
      'Threads aggressively tests short conversational posts with non-followers. Replies drive distribution much harder than passive likes, while external URLs inside the main body quietly suppress reach.',
    formatBlueprint:
      '1 punchy observation + 1 short supporting thought + an open question or trade-off. Put any URL in the self-reply.',
    whatWins: [
      'Keep the main post 80–320 characters with zero outbound links.',
      'Drop your demo or article link in an immediate self-reply.',
      'Speak directly to a real tension or lesson learned while building today.',
    ],
    avoidList: [
      'Do not paste raw URLs into the main body.',
      'Avoid multi-hashtag blocks or press-release announcements.',
    ],
    setupSteps: [
      {
        key: 'threads_profile_sync',
        label: 'Connect Threads to your standalone Instagram Creator login',
        detail:
          'Keep your public maker identity clean by importing your handle, photo, and bio in one tap.',
        whyItMatters:
          'Threads uses an Instagram login underneath. Connecting the right Creator account avoids accidentally posting product notes from an old personal handle.',
        howToSteps: [
          'Finish the standalone Instagram Creator account step below first.',
          'Open the Threads app and sign in using that new Instagram account.',
          'Tap Profile -> Edit Profile -> Import from Instagram to copy your avatar and bio.',
        ],
        actionUrl: 'https://www.threads.net/',
        actionLabel: 'Open Threads ↗',
      },
      {
        key: 'threads_bio_and_pin',
        label: 'Add one clear link in bio & pin a short "what I make" note',
        detail:
          'When a non-follower discovers a Threads post in their feed, give them one effortless doorway back to your work.',
        whyItMatters:
          'Because main Threads posts perform best without outbound links, curious readers tap your name to find your website or project.',
        howToSteps: [
          'Go to Edit Profile -> Link and paste your main homepage URL.',
          'Publish one 2-sentence post introducing what you build and tap the three-dot menu -> Pin to profile.',
          'Leave self-replies for individual post links going forward.',
        ],
        actionUrl: 'https://www.threads.net/',
        actionLabel: 'Edit Threads profile ↗',
      },
    ],
  },
  x: {
    platform: 'x',
    headline: 'High-conviction builder network — fastest feedback from peers & buyers',
    audiencePortrait:
      'Founders, engineers, designers, and early adopters who respect receipts, concrete screenshots, and zero fluff.',
    howItWorks:
      'Your highest-signal audience for shipping logs and product launches. Single tweets under 260 characters with a crisp UI screenshot or 16:9 demo clip outperform long walls of text.',
    formatBlueprint:
      'Lead with what changed or shipped -> 1 concrete detail or metric -> optional reply link or clean 2–4 post thread.',
    whatWins: [
      'Before/after UI screenshots or unedited 16:9 screen recordings.',
      'Direct builder voice with zero hashtags or corporate phrasing.',
      'Keep threads tight (2–4 numbered posts) when one idea needs room.',
    ],
    avoidList: [
      'Avoid vague motivational abstractions without a concrete artifact.',
      'Skip link-only posts without context above the card.',
    ],
    setupSteps: [
      {
        key: 'x_pin_home',
        label: 'Tighten your X bio line + set one direct link to your flagship home',
        detail:
          'Make sure anyone clicking your profile from a reply sees what you make in three seconds.',
        whyItMatters:
          'X rewards specific builders. A crisp one-line bio and single clear link turn drive-by screenshot views into returning readers or clients.',
        howToSteps: [
          'Open your X profile and click Edit profile.',
          'Write one plain sentence naming what you build (skip buzzwords and hashtags).',
          'Set the Website field to your flagship URL and pin your best live demo or launch post.',
        ],
        actionUrl: 'https://x.com/settings/profile',
        actionLabel: 'Open X profile ↗',
      },
    ],
  },
  facebook: {
    platform: 'facebook',
    headline: 'Warm personal & local network — effortless bonus reach alongside Threads',
    audiencePortrait:
      'Real-world friends, collaborators, former colleagues, and local community contacts who do not live on X.',
    howItWorks:
      'Because Meta operates both Threads and Facebook, adapting a Threads note into a slightly warmer story for Facebook takes seconds and reaches people who actually know you offline.',
    formatBlueprint:
      'Plain-English story (why this matters to real people) + optional screenshot or 16:9 video + link in the first comment.',
    whatWins: [
      'Write to a smart friend outside tech — explain the "why" plainly.',
      'Put external links in the first comment instead of the post body.',
      'Native widescreen 16:9 clips and screenshots play well directly in feed.',
    ],
    avoidList: [
      'Avoid insider developer jargon that shuts out warm non-tech connections.',
    ],
    setupSteps: [
      {
        key: 'fb_audience_check',
        label: 'Check default post audience & add a public website link',
        detail:
          'Decide whether public launch notes can be shared beyond Friends, or keep updates warmly Friends-only.',
        whyItMatters:
          'If your default Facebook audience is locked to "Only me" or hidden by old filters, friends cannot forward a launch note to people who might hire or collaborate with you.',
        howToSteps: [
          'Open Facebook -> click What’s on your mind? -> check the audience pill under your name.',
          'Set future product launches to Public (or Friends if keeping updates personal).',
          'Open Profile -> Edit Details and confirm your website link is visible.',
        ],
        actionUrl: 'https://www.facebook.com/',
        actionLabel: 'Open Facebook ↗',
      },
    ],
  },
  substack: {
    platform: 'substack',
    headline: 'High-intent readers & writers — essays, thoughtful notes, and direct links',
    audiencePortrait:
      'Long-form readers, writers, researchers, and founders looking for depth rather than hot takes.',
    howItWorks:
      'Substack Notes rewards thoughtful excerpts, architectural takeaways, and honest process reflections—and unlike Meta or X, links back to your writing or tools are welcomed.',
    formatBlueprint:
      '2–4 crisp paragraphs or a distilled takeaway from today’s build + direct link to try or read more.',
    whatWins: [
      'Share an authentic behind-the-scenes excerpt, diagram, or design trade-off.',
      'Link directly to your live demo, repo, or essay without hiding URLs.',
      'Cross-pollinate with writers in adjacent fields via thoughtful quotes.',
    ],
    avoidList: [
      'Avoid hyper-short engagement bait — Substack readers pause to read.',
    ],
    setupSteps: [
      {
        key: 'substack_notes_ready',
        label: 'Claim your Substack handle so Notes can hold links & essays',
        detail:
          'You do not need a weekly newsletter schedule just to share thoughtful short Notes.',
        whyItMatters:
          'Unlike Threads and Facebook, Substack welcomes direct links right inside your note and puts your work in front of patient readers.',
        howToSteps: [
          'Sign in at substack.com/notes and upload the same avatar you use elsewhere.',
          'Click Settings -> Basics and make sure your handle and short bio are filled in.',
          'Post a short hello note or link to something you wrote or shipped recently.',
        ],
        actionUrl: 'https://substack.com/notes',
        actionLabel: 'Open Substack Notes ↗',
      },
    ],
  },
  instagram: {
    platform: 'instagram',
    headline: 'Visual craft check — clean standalone portfolio without legacy clutter',
    audiencePortrait:
      'Visual thinkers, design-conscious founders, and newcomers checking whether your craft feels real.',
    howItWorks:
      'Instagram is visual-first: you cannot publish plain text alone. If your existing IG is tied to an old personal or comic project, spin up a dedicated Creator account rather than mixing audiences.',
    formatBlueprint:
      '4:5 UI screenshot or 3-slide before/after carousel + short 2–3 sentence caption pointing to your bio link.',
    whatWins: [
      'Start fresh with a dedicated Creator account (keeps analytics & Meta API clean).',
      'Pad 16:9 desktop screenshots onto a warm 4:5 canvas so typography stays sharp.',
      'Keep captions concise; 0–3 relevant tags max (or none).',
    ],
    avoidList: [
      'Do not paste raw URLs in captions — Instagram leaves them unclickable.',
      'Avoid squeezing wide 16:9 desktop video unframed into tiny Reels.',
    ],
    setupSteps: [
      {
        key: 'ig_fresh_creator_account',
        label: 'Spin up a clean standalone Instagram Creator account',
        detail:
          'Keep your product/design craft completely separate from older personal or unrelated hobby accounts.',
        whyItMatters:
          'A dedicated Creator account unlocks reach insights, clean Threads syncing, and future Meta Graph publishing without muddying an old follower list.',
        howToSteps: [
          'In Instagram, tap your username at the top -> Add Instagram account -> Create new account.',
          'Choose your current handle and complete sign-up.',
          'Go to Menu (≡) -> Account type and tools -> Switch to professional account -> Creator.',
        ],
        actionUrl: 'https://www.instagram.com/accounts/emailsignup/',
        actionLabel: 'Open Instagram ↗',
      },
      {
        key: 'ig_bio_and_avatar',
        label: 'Match your avatar, write a 3-line bio & add your 1 link',
        detail:
          'Instagram does not allow clickable links in post captions, so your profile carries every visitor click.',
        whyItMatters:
          'Consistent visual identity helps people recognize you immediately across X, Threads, and Substack.',
        howToSteps: [
          'Tap Edit Profile and upload your current headshot or studio mark.',
          'Add 1–2 plain lines saying what you make + tap Links -> Add external link.',
          'Enter your IG handle in Setup tab 02 so previews match how captions read.',
        ],
        actionUrl: 'https://www.instagram.com/',
        actionLabel: 'Edit IG bio ↗',
      },
    ],
  },
  tiktok: {
    platform: 'tiktok',
    headline: 'Preliminary Test Mode — interest-graph discovery (wired for later vertical clips)',
    audiencePortrait:
      'Topic-matched strangers interested in software craft, design systems, and live product demos.',
    howItWorks:
      'TikTok distributes videos purely on watch-time in a vertical 9:16 frame. Today this channel stays in Test Mode so you can draft punchy <150-char hooks without re-cutting 16:9 desktop demos into vertical video.',
    formatBlueprint:
      'Test Mode: keep caption under 150 chars as a 1-line hook; reserve 16:9 desktop recordings for X, Threads, Facebook, and Substack.',
    whatWins: [
      'When ready for vertical clips: put a 5-word visual hook on screen in seconds 0–3.',
      'Keep captions minimal (<150 chars) so the screen recording carries the story.',
    ],
    avoidList: [
      'Do not waste launch day re-exporting desktop 16:9 videos into awkward vertical crops.',
    ],
    setupSteps: [
      {
        key: 'tiktok_reserve_handle',
        label: 'Optional (Test Mode): reserve your handle on TikTok',
        detail:
          'Stay focused on text + 16:9 demos today while keeping your TikTok handle ready for future vertical clips.',
        whyItMatters:
          'No pressure to film vertical video right now—simply claiming your handle protects your name while asterisk keeps your short hook captions ready.',
        howToSteps: [
          'Sign in at tiktok.com and claim your matching studio or maker handle.',
          'Upload your avatar and add your homepage URL if available.',
          'Leave video uploads paused until you want dedicated 9:16 mobile screen recordings.',
        ],
        actionUrl: 'https://www.tiktok.com/tiktokstudio/upload',
        actionLabel: 'Open TikTok ↗',
      },
    ],
  },
};

/**
 * Splits text cleanly into numbered X posts (1/N) without cutting words mid-token.
 */
export function splitIntoXThread(rawText: string, maxChars: number = 280): string[] {
  const clean = String(rawText || '').trim();
  if (!clean) return [];
  if (clean.length <= maxChars) return [clean];

  const paragraphs = clean
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  // Reserve space for " (10/10)" suffix (~8 chars)
  const chunkLimit = Math.max(120, maxChars - 8);
  const chunks: string[] = [];

  for (const para of paragraphs) {
    if (para.length <= chunkLimit) {
      chunks.push(para);
      continue;
    }

    const words = para.split(/\s+/);
    let current = '';
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (candidate.length <= chunkLimit) {
        current = candidate;
      } else {
        if (current) chunks.push(current);
        current = word.length > chunkLimit ? word.slice(0, chunkLimit) : word;
      }
    }
    if (current) chunks.push(current);
  }

  if (chunks.length <= 1) return chunks;
  return chunks.map((chunk, i) => `${chunk} (${i + 1}/${chunks.length})`);
}

/**
 * Extracts URLs from a draft so the main post stays link-free and URLs move to a self-reply / first comment.
 */
export function extractLinksForThreadsReply(rawText: string): { mainText: string; replyText: string } {
  const text = String(rawText || '').trim();
  const urls = text.match(/https?:\/\/[^\s]+/gi) || [];
  if (urls.length === 0) {
    return { mainText: text, replyText: '' };
  }

  const mainText = text
    .replace(/https?:\/\/[^\s]+/gi, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return {
    mainText,
    replyText: `Link: ${urls.join(' ')}`,
  };
}

/**
 * Adapts a raw seed note into a clean starting draft tailored for a specific platform.
 */
export function adaptSeedToPlatform(
  platform: PlatformId,
  rawSeed: string
): { bodyText: string; replyText: string } {
  const raw = String(rawSeed || '').trim();
  if (!raw) return { bodyText: '', replyText: '' };

  if (platform === 'threads' || platform === 'facebook') {
    const split = extractLinksForThreadsReply(raw);
    return { bodyText: split.mainText, replyText: split.replyText };
  }

  if (platform === 'tiktok') {
    const clean = raw.replace(/https?:\/\/[^\s]+/gi, '').replace(/\s+/g, ' ').trim();
    if (clean.length <= 150) return { bodyText: clean, replyText: '' };
    const slice = clean.slice(0, 147);
    const lastSpace = slice.lastIndexOf(' ');
    const trimmed = (lastSpace > 80 ? slice.slice(0, lastSpace) : slice).trim();
    return { bodyText: `${trimmed}…`, replyText: '' };
  }

  return { bodyText: raw, replyText: '' };
}

export interface AnalysisCheck {
  id: string;
  label: string;
  status: 'pass' | 'warn' | 'info';
  detail: string;
  fixAction?: 'move_url_to_reply';
}

export interface DraftAnalysis {
  readiness: 'empty' | 'ready' | 'tune' | 'fix';
  readinessLabel: string;
  checks: AnalysisCheck[];
}

/**
 * Deterministic pre-flight signal check calibrated per platform's distribution rules.
 */
export function analyzeDraftForPlatform(
  platform: PlatformId,
  bodyText: string,
  replyText: string = '',
  mediaNote: string = '',
  attachments: MediaAttachment[] = []
): DraftAnalysis {
  const trimmed = String(bodyText || '').trim();
  if (!trimmed) {
    return {
      readiness: 'empty',
      readinessLabel: 'Awaiting draft',
      checks: [],
    };
  }

  const spec = PLATFORM_SPECS[platform];
  const len = trimmed.length;
  const checks: AnalysisCheck[] = [];

  // 1. Length vs platform sweet spot
  if (platform === 'x' && len > spec.charLimit) {
    const parts = splitIntoXThread(trimmed, spec.charLimit);
    checks.push({
      id: 'length',
      label: 'Thread split',
      status: 'info',
      detail: `Exceeds 280 chars — will publish or copy cleanly as a ${parts.length}-post thread (${len} chars total).`,
    });
  } else if (len > spec.charLimit) {
    checks.push({
      id: 'length',
      label: 'Length ceiling',
      status: 'warn',
      detail: `Over ${spec.name}'s ${spec.charLimit}-char limit by ${len - spec.charLimit} chars.`,
    });
  } else if (len < spec.sweetSpotMin) {
    checks.push({
      id: 'length',
      label: 'Room for context',
      status: 'info',
      detail: `${len} chars — ${spec.name} posts usually land best between ${spec.sweetSpotMin}–${spec.sweetSpotMax} chars.`,
    });
  } else if (len <= spec.sweetSpotMax) {
    checks.push({
      id: 'length',
      label: 'Length sweet spot',
      status: 'pass',
      detail: `${len} chars hits ${spec.name}'s high-retention zone (${spec.sweetSpotMin}–${spec.sweetSpotMax} chars).`,
    });
  } else {
    checks.push({
      id: 'length',
      label: 'Above sweet spot',
      status: 'info',
      detail: `${len} chars fits under ${spec.charLimit}, though ${spec.sweetSpotMin}–${spec.sweetSpotMax} chars keeps feed momentum.`,
    });
  }

  // 2. Opening hook
  const firstLine = trimmed.split('\n')[0]?.trim() || '';
  if (/^https?:\/\//i.test(firstLine)) {
    checks.push({
      id: 'hook',
      label: 'Opening hook',
      status: 'warn',
      detail: 'Starts with a raw URL. Lead with a clear human observation first.',
    });
  } else if (firstLine.length > 140 && !trimmed.includes('\n')) {
    checks.push({
      id: 'hook',
      label: 'Opening hook',
      status: 'info',
      detail: 'Single unbroken block — add a line break after sentence 1 so mobile readers see the hook before expanding.',
    });
  } else if (firstLine.length >= 16) {
    checks.push({
      id: 'hook',
      label: 'Opening hook',
      status: 'pass',
      detail: 'First line stands clearly on its own above the feed fold.',
    });
  } else {
    checks.push({
      id: 'hook',
      label: 'Opening hook',
      status: 'info',
      detail: 'Very brief opener — check that line 1 carries standalone curiosity.',
    });
  }

  // 3. Link placement policy
  const hasUrlInBody = /https?:\/\/[^\s]+/i.test(trimmed);
  const hasUrlInReply = /https?:\/\/[^\s]+/i.test(replyText);

  if (platform === 'threads' || platform === 'facebook') {
    if (hasUrlInBody) {
      checks.push({
        id: 'links',
        label: 'Link placement',
        status: 'warn',
        detail: `Outbound links inside main ${spec.name} posts suppress reach. Move the URL to your ${
          platform === 'threads' ? 'self-reply' : 'first comment'
        }.`,
        fixAction: 'move_url_to_reply',
      });
    } else if (hasUrlInReply) {
      checks.push({
        id: 'links',
        label: 'Link placement',
        status: 'pass',
        detail: `Main post stays link-free while your URL waits cleanly in the ${
          platform === 'threads' ? 'self-reply' : 'first comment'
        }.`,
      });
    } else {
      checks.push({
        id: 'links',
        label: 'Link placement',
        status: 'pass',
        detail: 'Zero outbound link throttling in the main post.',
      });
    }
  } else if (platform === 'instagram') {
    checks.push(
      hasUrlInBody
        ? {
            id: 'links',
            label: 'Link placement',
            status: 'warn',
            detail: 'Instagram captions do not turn URLs into clickable links. Point readers to your bio link instead.',
          }
        : {
            id: 'links',
            label: 'Link placement',
            status: 'pass',
            detail: 'Clean caption free of unclickable URL strings.',
          }
    );
  } else if (platform === 'tiktok') {
    checks.push(
      hasUrlInBody
        ? {
            id: 'links',
            label: 'Link placement',
            status: 'warn',
            detail: 'Drop raw URLs from TikTok captions — keep captions concise (<150 chars).',
          }
        : {
            id: 'links',
            label: 'Link placement',
            status: 'pass',
            detail: 'Clean caption without dead links.',
          }
    );
  } else if (platform === 'substack') {
    checks.push(
      hasUrlInBody
        ? {
            id: 'links',
            label: 'Direct link',
            status: 'pass',
            detail: 'Includes a direct link — Substack Notes encourages outbound reading and restacks.',
          }
        : {
            id: 'links',
            label: 'Direct link',
            status: 'info',
            detail: 'Add a direct URL if referencing an essay, repo, or live app; optional for standalone thoughts.',
          }
    );
  } else {
    checks.push(
      hasUrlInBody
        ? {
            id: 'links',
            label: 'Link placement',
            status: 'info',
            detail: 'Pairing an X link with a crisp screenshot or moving the URL to a quick reply often protects reach.',
          }
        : {
            id: 'links',
            label: 'Link placement',
            status: 'pass',
            detail: 'Zero outbound link friction in the main post.',
          }
    );
  }

  // 4. Tone, hashtags & conversation trigger
  const hashtags = trimmed.match(/#[a-z0-9_]+/gi) || [];
  if (hashtags.length > 2) {
    checks.push({
      id: 'resonance',
      label: 'Tone & hashtags',
      status: 'warn',
      detail: `${hashtags.length} hashtags found. Stick to 0–2 max so it reads like a human builder.`,
    });
  } else if (platform === 'threads' || platform === 'facebook') {
    const invitesReply = /\?|\b(thoughts|curious|would you|how do you|what do you)\b/i.test(trimmed);
    checks.push(
      invitesReply
        ? {
            id: 'resonance',
            label: 'Conversation signal',
            status: 'pass',
            detail: 'Invites a real reply — replies are the strongest distribution signal here.',
          }
        : {
            id: 'resonance',
            label: 'Conversation signal',
            status: 'info',
            detail: 'Consider ending with an honest question or trade-off to spark replies.',
          }
    );
  } else {
    checks.push({
      id: 'resonance',
      label: 'Voice & clarity',
      status: 'pass',
      detail: 'Clean, human phrasing without hashtag clutter.',
    });
  }

  // 5. Media, up-to-4 image attachments & aspect ratios
  const note = mediaNote.trim();
  const mentions16x9 = /16\s*[:x/]\s*9|widescreen|landscape|desktop/i.test(note);
  const imageCount = attachments.length;
  const aspectSummary = attachments
    .map((img) => formatAspectBadge(img.width, img.height))
    .join(', ');
  const hasWideImage = attachments.some((img) => img.height > 0 && img.width / img.height > 1.35);

  if (imageCount > MAX_MEDIA_IMAGES) {
    checks.push({
      id: 'media',
      label: 'Image limit',
      status: 'warn',
      detail: `${imageCount} images selected — keep posts to 1–4 images so X and multi-room layouts hold cleanly.`,
    });
  } else if (platform === 'tiktok') {
    checks.push(
      mentions16x9
        ? {
            id: 'media',
            label: 'Test mode · 16:9 clip',
            status: 'warn',
            detail: 'Keep 16:9 desktop demos on X, Threads & Substack today; TikTok stays in Test Mode until 9:16 vertical clips are ready.',
          }
        : imageCount > 0
          ? {
              id: 'media',
              label: 'Test mode · images queued',
              status: 'info',
              detail: `${imageCount} image${imageCount > 1 ? 's' : ''} ready (${aspectSummary}); works in TikTok Photo Mode or pair with a 9:16 clip.`,
            }
          : {
              id: 'media',
              label: 'Preliminary Test Mode',
              status: 'info',
              detail: 'Caption hook is wired and ready; vertical 9:16 video upload remains optional today.',
            }
    );
  } else if (platform === 'instagram') {
    if (!note && imageCount === 0) {
      checks.push({
        id: 'media',
        label: 'Visual required',
        status: 'warn',
        detail: 'Instagram requires an image, carousel, or Reel — attach up to 4 frames (4:5 or 1:1) below.',
      });
    } else if (hasWideImage || mentions16x9) {
      checks.push({
        id: 'media',
        label: 'Aspect ratio check',
        status: 'warn',
        detail: 'Wide landscape images crop tightly on Instagram. Frame or pad screenshots onto a 4:5 (1080×1350) canvas.',
      });
    } else if (imageCount > 0) {
      checks.push({
        id: 'media',
        label: 'Visuals ready',
        status: 'pass',
        detail: `${imageCount} image${imageCount > 1 ? 's' : ''} queued (${aspectSummary}) — clean portrait/square framing for IG.`,
      });
    } else {
      checks.push({
        id: 'media',
        label: 'Visual queued',
        status: 'pass',
        detail: `Visual planned: ${note}.`,
      });
    }
  } else if (imageCount > 0) {
    checks.push({
      id: 'media',
      label: 'Images attached',
      status: 'pass',
      detail: `${imageCount} image${imageCount > 1 ? 's' : ''} attached (${aspectSummary}) — ready for ${spec.shortName}.`,
    });
  } else if (note) {
    checks.push({
      id: 'media',
      label: 'Visual / 16:9 media',
      status: 'pass',
      detail: `Media noted ("${note}") — 16:9 screenshots and clips play naturally on ${spec.shortName}.`,
    });
  } else {
    checks.push({
      id: 'media',
      label: 'Visual polish',
      status: 'info',
      detail: 'Strong text works solo; attaching 1–4 screenshots or pulling from a Pipe tends to lift saves.',
    });
  }

  const warnCount = checks.filter((c) => c.status === 'warn').length;
  const infoCount = checks.filter((c) => c.status === 'info').length;

  if (warnCount > 0) {
    return { readiness: 'fix', readinessLabel: 'Needs attention', checks };
  }
  if (infoCount >= 2) {
    return { readiness: 'tune', readinessLabel: 'Worth tuning', checks };
  }
  return { readiness: 'ready', readinessLabel: 'Ready to ship', checks };
}

export interface CadenceStatus {
  platform: PlatformId;
  lastPublishedAt: string | null;
  daysSince: number | null;
  state: 'never' | 'fresh' | 'due' | 'overdue';
  badgeLabel: string;
}

export function computeCadenceStatus(
  platform: PlatformId,
  lastPublishedAt: string | null,
  cadenceDays: number,
  now: Date = new Date()
): CadenceStatus {
  if (!lastPublishedAt) {
    return {
      platform,
      lastPublishedAt: null,
      daysSince: null,
      state: 'never',
      badgeLabel: 'Ready',
    };
  }

  const normalizedIso = lastPublishedAt.includes('T')
    ? lastPublishedAt
    : `${lastPublishedAt.replace(' ', 'T')}Z`;
  const parsedMs = Date.parse(normalizedIso);
  if (!Number.isFinite(parsedMs)) {
    return {
      platform,
      lastPublishedAt,
      daysSince: null,
      state: 'never',
      badgeLabel: 'Ready',
    };
  }

  const diffDays = Math.max(0, Math.floor((now.getTime() - parsedMs) / (1000 * 60 * 60 * 24)));
  if (diffDays === 0) {
    return { platform, lastPublishedAt, daysSince: 0, state: 'fresh', badgeLabel: 'Shared today' };
  }
  if (diffDays < cadenceDays) {
    return { platform, lastPublishedAt, daysSince: diffDays, state: 'fresh', badgeLabel: `${diffDays}d ago` };
  }
  if (diffDays === cadenceDays) {
    return { platform, lastPublishedAt, daysSince: diffDays, state: 'due', badgeLabel: `${diffDays}d quiet` };
  }
  return {
    platform,
    lastPublishedAt,
    daysSince: diffDays,
    state: 'overdue',
    badgeLabel: `${diffDays}d quiet`,
  };
}
