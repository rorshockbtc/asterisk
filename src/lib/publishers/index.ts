import type { PlatformId } from '../platforms';

export interface PublishAttemptResult {
  ok: boolean;
  mode: 'copy' | 'api';
  fallbackToCopy?: boolean;
  externalUrl?: string;
  message: string;
}

export function getApiConnectionStatus(): Record<PlatformId, { configured: boolean; note: string }> {
  return {
    x: {
      configured: Boolean(process.env.X_ACCESS_TOKEN),
      note: process.env.X_ACCESS_TOKEN
        ? 'X OAuth token configured'
        : 'Copy-ready (add X_ACCESS_TOKEN in .env.local for direct API post)',
    },
    threads: {
      configured: Boolean(process.env.THREADS_ACCESS_TOKEN && process.env.THREADS_USER_ID),
      note:
        process.env.THREADS_ACCESS_TOKEN && process.env.THREADS_USER_ID
          ? 'Threads Graph API configured'
          : 'Copy-ready (add THREADS_ACCESS_TOKEN + THREADS_USER_ID for free auto-publish)',
    },
    instagram: {
      configured: Boolean(process.env.IG_ACCESS_TOKEN && process.env.IG_USER_ID),
      note: 'Copy-ready (image/carousel upload stays native in Instagram)',
    },
    tiktok: {
      configured: Boolean(process.env.TIKTOK_ACCESS_TOKEN),
      note: 'Copy-ready (upload vertical clip directly in TikTok Studio)',
    },
  };
}

/**
 * Publishes via official platform API when OAuth tokens exist, or records manual Copy-and-Post.
 */
export async function dispatchVariant({
  platform,
  bodyText,
  replyText,
  mode,
}: {
  platform: PlatformId;
  bodyText: string;
  replyText?: string;
  mode: 'copy' | 'api';
}): Promise<PublishAttemptResult> {
  if (mode === 'copy') {
    return {
      ok: true,
      mode: 'copy',
      message: `Marked ${platform.toUpperCase()} as posted via Copy & Paste.`,
    };
  }

  if (platform === 'threads') {
    const token = process.env.THREADS_ACCESS_TOKEN;
    const userId = process.env.THREADS_USER_ID;
    if (!token || !userId) {
      return {
        ok: false,
        mode: 'api',
        fallbackToCopy: true,
        message: 'Threads API tokens are not configured yet — use Copy Post & Open Threads.',
      };
    }

    // Step 1: Create Threads container
    const createRes = await fetch(`https://graph.threads.net/v1.0/${encodeURIComponent(userId)}/threads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ media_type: 'TEXT', text: bodyText, access_token: token }),
      signal: AbortSignal.timeout(10000),
    });
    const createJson = await createRes.json();
    if (!createRes.ok || !createJson.id) {
      return {
        ok: false,
        mode: 'api',
        fallbackToCopy: true,
        message: `Threads container error: ${createJson.error?.message || createRes.status}`,
      };
    }

    // Step 2: Publish container
    const pubRes = await fetch(`https://graph.threads.net/v1.0/${encodeURIComponent(userId)}/threads_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: createJson.id, access_token: token }),
      signal: AbortSignal.timeout(10000),
    });
    const pubJson = await pubRes.json();
    if (!pubRes.ok || !pubJson.id) {
      return {
        ok: false,
        mode: 'api',
        fallbackToCopy: true,
        message: `Threads publish error: ${pubJson.error?.message || pubRes.status}`,
      };
    }

    // Optional self-reply with link so main Threads post keeps full organic reach
    if (replyText && replyText.trim()) {
      const replyCreate = await fetch(`https://graph.threads.net/v1.0/${encodeURIComponent(userId)}/threads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_type: 'TEXT',
          text: replyText.trim(),
          reply_to_id: pubJson.id,
          access_token: token,
        }),
        signal: AbortSignal.timeout(10000),
      });
      const rcJson = await replyCreate.json();
      if (replyCreate.ok && rcJson.id) {
        await fetch(`https://graph.threads.net/v1.0/${encodeURIComponent(userId)}/threads_publish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ creation_id: rcJson.id, access_token: token }),
          signal: AbortSignal.timeout(10000),
        });
      }
    }

    return {
      ok: true,
      mode: 'api',
      externalUrl: `https://www.threads.net/`,
      message: 'Published directly to Threads via official Graph API!',
    };
  }

  if (platform === 'x') {
    const token = process.env.X_ACCESS_TOKEN;
    if (!token) {
      return {
        ok: false,
        mode: 'api',
        fallbackToCopy: true,
        message: 'X_ACCESS_TOKEN is not configured yet — use Copy Post & Open X.',
      };
    }

    const res = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: bodyText }),
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json();
    if (!res.ok || !data?.data?.id) {
      return {
        ok: false,
        mode: 'api',
        fallbackToCopy: true,
        message: `X API error: ${data.detail || data.title || res.status}`,
      };
    }

    return {
      ok: true,
      mode: 'api',
      externalUrl: `https://x.com/i/web/status/${data.data.id}`,
      message: 'Published directly to X!',
    };
  }

  return {
    ok: false,
    mode: 'api',
    fallbackToCopy: true,
    message: `${platform.toUpperCase()} uses Copy + manual media upload until OAuth media bridge is added.`,
  };
}
