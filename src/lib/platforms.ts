export type PlatformId = 'x' | 'threads' | 'instagram' | 'tiktok';

export interface PlatformSpec {
  id: PlatformId;
  name: string;
  shortName: string;
  charLimit: number;
  recommendedLimit: number;
  composeUrl: string;
  mediaRequirement: string;
  accentHex: string;
  cadenceDefaultDays: number;
}

export const PLATFORM_ORDER: PlatformId[] = ['x', 'threads', 'instagram', 'tiktok'];

export const PLATFORM_SPECS: Record<PlatformId, PlatformSpec> = {
  x: {
    id: 'x',
    name: 'X (Twitter)',
    shortName: 'X',
    charLimit: 280,
    recommendedLimit: 260,
    composeUrl: 'https://x.com/compose/post',
    mediaRequirement: 'Optional (UI screenshots perform best)',
    accentHex: '#0F172A',
    cadenceDefaultDays: 3,
  },
  threads: {
    id: 'threads',
    name: 'Threads',
    shortName: 'Threads',
    charLimit: 500,
    recommendedLimit: 320,
    composeUrl: 'https://www.threads.net/',
    mediaRequirement: 'Text-first (put links in self-reply)',
    accentHex: '#111827',
    cadenceDefaultDays: 4,
  },
  instagram: {
    id: 'instagram',
    name: 'Instagram',
    shortName: 'IG',
    charLimit: 2200,
    recommendedLimit: 400,
    composeUrl: 'https://www.instagram.com/',
    mediaRequirement: 'Required: 4:5 screenshot, carousel, or Reel',
    accentHex: '#C13584',
    cadenceDefaultDays: 5,
  },
  tiktok: {
    id: 'tiktok',
    name: 'TikTok',
    shortName: 'TikTok',
    charLimit: 2200,
    recommendedLimit: 150,
    composeUrl: 'https://www.tiktok.com/tiktokstudio/upload',
    mediaRequirement: 'Required: 15–30s vertical clip / screen recording',
    accentHex: '#0F766E',
    cadenceDefaultDays: 7,
  },
};

export interface PlatformGuide {
  platform: PlatformId;
  headline: string;
  howItWorks: string;
  whatWins: string[];
  setupSteps: { key: string; label: string; detail: string }[];
}

export const PLATFORM_GUIDES: Record<PlatformId, PlatformGuide> = {
  x: {
    platform: 'x',
    headline: 'High buyer density — founders, VCs & Bitcoin/tech peers',
    howItWorks:
      'Your home turf. Fewer raw impressions than Threads for small accounts, but the highest conversion density per 1,000 views for $7.5k sprints and Pipes.',
    whatWins: [
      'Before/after UI teardowns with one concrete screenshot.',
      'Direct builder observations without hashtags or corporate tone.',
      'Split anything >280 chars into a crisp 2–4 post thread.',
    ],
    setupSteps: [
      {
        key: 'x_bio_link',
        label: 'Pin your Colon Hyphen Bracket sprint link in X bio',
        detail: 'Keep one clear link (colonhyphenbracket.pink/studio) and a 1-line bio stating what you ship.',
      },
    ],
  },
  threads: {
    platform: 'threads',
    headline: 'Organic reach arbitrage — Meta pushes text posts to non-followers',
    howItWorks:
      'Threads is linked directly to your Instagram login. Unlike X, the Threads feed actively distributes short conversational posts from 200-follower accounts to thousands of non-followers.',
    whatWins: [
      'Keep the main post 1–3 crisp sentences with NO external link.',
      'If sharing a URL, put it in a reply to your own post (links in the main post get throttled).',
      'End with an open, honest question or observation—replies fuel the algorithm.',
    ],
    setupSteps: [
      {
        key: 'threads_ig_sync',
        label: 'Set your Instagram headshot & bio first, then import into Threads',
        detail: 'In Threads -> Edit Profile -> tap "Import from Instagram". Your profile picture and bio sync in 1 tap so you never have to configure both separately.',
      },
      {
        key: 'threads_first_post',
        label: 'Publish 1 short builder observation (zero links) to wake up the feed',
        detail: 'Pick any 2-sentence note on design systems, AI tooling, or HighDraw golf and hit Post.',
      },
    ],
  },
  instagram: {
    platform: 'instagram',
    headline: 'Visual portfolio & HighDraw (golf) credibility check',
    howItWorks:
      'Instagram will not let you post plain text alone—every post needs an image, carousel, or short video Reel. Founders and golf partners check IG to verify visual craft.',
    whatWins: [
      'Export 1 clean Figma/app screenshot or 3-slide before/after UI carousel.',
      'Put the story in the caption; keep hashtags minimal (0–3 max, or none).',
      'Same clip/screenshot you post here can be reused on X and TikTok.',
    ],
    setupSteps: [
      {
        key: 'ig_profile_pic',
        label: 'Upload a clear headshot (or CHB/HighDraw mark) + 3-line bio',
        detail: 'Line 1: What you build · Line 2: Custodia / Walmart / Optum receipt · Line 3: colonhyphenbracket.pink.',
      },
      {
        key: 'ig_creator_switch',
        label: 'Switch IG to a free Professional (Creator) account',
        detail: 'IG Settings -> Account type and tools -> Switch to professional account (Creator). Unlocks analytics and future API auto-publishing without touching personal Facebook.',
      },
    ],
  },
  tiktok: {
    platform: 'tiktok',
    headline: 'Interest graph — 0 followers can still get 1,000+ views',
    howItWorks:
      'TikTok does not care how many followers you have. Every video is tested on a small batch of 200–300 viewers interested in that topic (design, dev tools, golf) and expands if people watch past 3 seconds.',
    whatWins: [
      'Record a 15–30s QuickTime screen recording of a UI fix, Pipes local search, or HighDraw golf clip.',
      'Put a 5-word text hook on screen for the first 3 seconds.',
      'Keep the caption under 150 characters—let the video/screen speak.',
    ],
    setupSteps: [
      {
        key: 'tiktok_profile',
        label: 'Claim handle, upload profile picture & add 1-line bio on TikTok',
        detail: 'Match the same headshot and handle you use on X/IG so people recognize you across platforms.',
      },
      {
        key: 'tiktok_first_clip',
        label: 'Post one 15-second screen recording (no face-cam required)',
        detail: 'Use QuickTime (Cmd+Shift+5) to record a 15s UI before/after or terminal workflow, add a short caption, and upload.',
      },
    ],
  },
};

/**
 * Splits text cleanly into numbered tweets (1/N) without cutting words mid-token.
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
 * Extracts URLs from a Threads draft so the main post stays link-free and URLs move to a self-reply.
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
      badgeLabel: 'Never posted',
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
      badgeLabel: 'Never posted',
    };
  }

  const diffDays = Math.max(0, Math.floor((now.getTime() - parsedMs) / (1000 * 60 * 60 * 24)));
  if (diffDays === 0) {
    return { platform, lastPublishedAt, daysSince: 0, state: 'fresh', badgeLabel: 'Posted today' };
  }
  if (diffDays < cadenceDays) {
    return { platform, lastPublishedAt, daysSince: diffDays, state: 'fresh', badgeLabel: `${diffDays}d ago` };
  }
  if (diffDays === cadenceDays) {
    return { platform, lastPublishedAt, daysSince: diffDays, state: 'due', badgeLabel: `${diffDays}d ago · Due` };
  }
  return {
    platform,
    lastPublishedAt,
    daysSince: diffDays,
    state: 'overdue',
    badgeLabel: `${diffDays}d ago · Nudge`,
  };
}
