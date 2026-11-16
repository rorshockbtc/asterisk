import {
  adaptSeedToPlatform,
  PLATFORM_ORDER,
  type PlatformId,
} from './platforms.ts';
import {
  PIPES_DIRECT_SIGNIN_URL,
  PIPES_HASH_URL,
  PIPES_ORIGIN,
} from './session.ts';
import type { VariantRecord } from './studio-types.ts';

export interface PipesSessionUser {
  id: string;
  handle: string;
  email: string;
  tier: string;
  ownedPipes: string[];
  followedPipes: string[];
  curatedPipes: string[];
  personalPipe: string;
  personalPipeUrl: string;
  hashVaultUrl: string;
  myDeskUrl: string;
  asteriskBridgeUrl: string;
}

export interface PipesSessionPayload {
  authenticated: boolean;
  user?: PipesSessionUser;
  loginUrl?: string;
  asteriskBridgeUrl?: string;
  tier?: string;
}

export interface SaveToPipesPayload {
  title: string;
  content: string;
  writingMode?: 'quick' | 'journal' | 'monograph';
  source: 'asterisk';
  channels?: string[];
  extensionNote?: string;
  publishToPersonalPipe?: boolean;
  publishedPipe?: string;
  sourceTitle?: string;
  sourceUrl?: string;
  tags?: string[];
}

export interface SaveToPipesResponse {
  entry: {
    id: string;
    title: string;
    writingMode: string;
    isPrivate: boolean;
    publishedPipe: string | null;
    wordCount: number;
    hasFullContent: boolean;
  };
  contentHash: string;
  publishedPipe: string | null;
  publishedUrl: string | null;
  extendInHashUrl: string;
}

export type SaveToPipesResult =
  | { ok: true; data: SaveToPipesResponse }
  | { ok: false; needsAuth: true; loginUrl: string }
  | { ok: false; needsAuth: false; offline: boolean; message: string };

/**
 * Reads the signed-in user's shared Pipes / Hash / Personal Pipe context.
 * Returns null gracefully when unreachable (e.g. offline localhost without :3002 running).
 */
export async function fetchPipesSession(): Promise<PipesSessionPayload | null> {
  try {
    const res = await fetch(`${PIPES_ORIGIN}/api/auth/session`, {
      method: 'GET',
      credentials: 'include',
      signal: AbortSignal.timeout(4500),
    });
    if (!res.ok) return null;
    return (await res.json()) as PipesSessionPayload;
  } catch {
    return null;
  }
}

/**
 * Persists a draft to Hash (`POST /api/hash/entries`) and optionally publishes directly to the user's
 * Personal Pipe (`pipe\<handle>`) when `publishToPersonalPipe` is true.
 */
export async function saveDraftToPipes(payload: SaveToPipesPayload): Promise<SaveToPipesResult> {
  try {
    const res = await fetch(`${PIPES_ORIGIN}/api/hash/entries`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });

    if (res.status === 401) {
      return { ok: false, needsAuth: true, loginUrl: PIPES_DIRECT_SIGNIN_URL };
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return {
        ok: false,
        needsAuth: false,
        offline: false,
        message: String((err as { error?: string }).error || 'Failed to save to Hash on Pipes.'),
      };
    }

    const data = (await res.json()) as SaveToPipesResponse;
    return { ok: true, data };
  } catch {
    return {
      ok: false,
      needsAuth: false,
      offline: true,
      message: 'Pipes endpoint unreachable right now — saved locally.',
    };
  }
}

export function buildHashDraftUrl(title: string, draft: string): string {
  const url = new URL(PIPES_HASH_URL);
  url.searchParams.set('from', 'asterisk');
  if (title.trim()) url.searchParams.set('title', title.trim());
  if (draft.trim()) url.searchParams.set('draft', draft.trim().slice(0, 1200));
  return url.toString();
}

function appendUrlIfMissing(body: string, sourceUrl: string): string {
  const cleanUrl = sourceUrl.trim();
  const cleanBody = body.trim();
  if (!cleanUrl) return cleanBody;
  if (cleanBody.includes(cleanUrl)) return cleanBody;
  return cleanBody ? `${cleanBody}\n\n${cleanUrl}` : cleanUrl;
}

/**
 * Pure inbound translator for "Post to Social *" links arriving from pipes.pink:
 * - Threads & Facebook: removes `sourceUrl` from main body and slots it safely into `reply_text` (`Link: ...`).
 * - X & Substack: keeps `sourceUrl` ready in the post body.
 * - Instagram & TikTok: keeps captions link-free.
 */
export function adaptInboundFromPipes({
  draft = '',
  sourceTitle = '',
  sourceUrl = '',
}: {
  draft?: string;
  sourceTitle?: string;
  sourceUrl?: string;
}): {
  title: string;
  seedText: string;
  variants: Record<PlatformId, VariantRecord>;
} {
  const cleanDraft = String(draft || '').trim();
  const cleanUrl = String(sourceUrl || '').trim();
  const cleanTitle = String(sourceTitle || '').trim();

  // Keep seed text clean while preserving source URL cleanly for non-throttled rooms
  const seedForRooms = cleanDraft || cleanTitle;
  const seedWithUrl = appendUrlIfMissing(seedForRooms, cleanUrl);

  const variants = {} as Record<PlatformId, VariantRecord>;
  for (const pid of PLATFORM_ORDER) {
    if (pid === 'threads' || pid === 'facebook') {
      const adapted = adaptSeedToPlatform(pid, seedForRooms);
      const replyUrl = cleanUrl ? `Link: ${cleanUrl}` : adapted.replyText;
      variants[pid] = {
        platform: pid,
        body_text: adapted.bodyText,
        reply_text: adapted.replyText || replyUrl,
        status: 'draft',
      };
    } else if (pid === 'substack' || pid === 'x') {
      const adapted = adaptSeedToPlatform(pid, seedWithUrl);
      variants[pid] = {
        platform: pid,
        body_text: adapted.bodyText,
        reply_text: adapted.replyText,
        status: 'draft',
      };
    } else {
      const adapted = adaptSeedToPlatform(pid, seedForRooms);
      variants[pid] = {
        platform: pid,
        body_text: adapted.bodyText,
        reply_text: adapted.replyText,
        status: 'draft',
      };
    }
  }

  return {
    title: cleanTitle,
    seedText: seedForRooms,
    variants,
  };
}
