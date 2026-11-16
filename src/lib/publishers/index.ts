import { splitIntoXThread, type PlatformId } from '../platforms';

export interface PublishAttemptResult {
  ok: boolean;
  mode: 'copy' | 'api';
  fallbackToCopy?: boolean;
  externalUrl?: string;
  message: string;
}

export function getApiConnectionStatus(): Record<PlatformId, { configured: boolean; note: string }> {
  const threadsReady = Boolean(process.env.THREADS_ACCESS_TOKEN && process.env.THREADS_USER_ID);
  const xReady = Boolean(process.env.X_ACCESS_TOKEN);

  return {
    threads: {
      configured: threadsReady,
      note: threadsReady
        ? 'Threads Graph API live (supports self-reply links)'
        : 'Copy-ready today (optional THREADS_ACCESS_TOKEN + THREADS_USER_ID in .env.local)',
    },
    x: {
      configured: xReady,
      note: xReady
        ? 'X API v2 live (supports threads & self-replies)'
        : 'Copy-ready today (optional X_ACCESS_TOKEN in .env.local)',
    },
    facebook: {
      configured: false,
      note: 'Copy & Open Facebook (drop URL in first comment)',
    },
    substack: {
      configured: false,
      note: 'Copy & Open Substack Notes',
    },
    instagram: {
      configured: false,
      note: 'Copy caption & upload 4:5 visual natively in Instagram',
    },
    tiktok: {
      configured: false,
      note: 'Test Mode — copy hook caption; 9:16 video optional today',
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
      message: `Marked ${platform.toUpperCase()} as posted via Copy & Open.`,
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
        message: 'Threads API tokens are not set yet — use Copy & Open Threads.',
      };
    }

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

    let replyPosted = false;
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
        const replyPub = await fetch(`https://graph.threads.net/v1.0/${encodeURIComponent(userId)}/threads_publish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ creation_id: rcJson.id, access_token: token }),
          signal: AbortSignal.timeout(10000),
        });
        replyPosted = replyPub.ok;
      }
    }

    return {
      ok: true,
      mode: 'api',
      externalUrl: 'https://www.threads.net/',
      message: replyPosted
        ? 'Published to Threads and attached your self-reply link!'
        : 'Published directly to Threads via Graph API!',
    };
  }

  if (platform === 'x') {
    const token = process.env.X_ACCESS_TOKEN;
    if (!token) {
      return {
        ok: false,
        mode: 'api',
        fallbackToCopy: true,
        message: 'X_ACCESS_TOKEN is not set yet — use Copy & Open X.',
      };
    }

    const parts = splitIntoXThread(bodyText, 280);
    if (replyText && replyText.trim()) {
      parts.push(replyText.trim().slice(0, 280));
    }

    let rootId = '';
    let prevId = '';

    for (const part of parts) {
      const payload: { text: string; reply?: { in_reply_to_tweet_id: string } } = { text: part };
      if (prevId) {
        payload.reply = { in_reply_to_tweet_id: prevId };
      }

      const res = await fetch('https://api.twitter.com/2/tweets', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
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
      if (!rootId) rootId = data.data.id;
      prevId = data.data.id;
    }

    return {
      ok: true,
      mode: 'api',
      externalUrl: `https://x.com/i/web/status/${rootId}`,
      message:
        parts.length > 1
          ? `Published ${parts.length}-post thread to X!`
          : 'Published directly to X!',
    };
  }

  return {
    ok: false,
    mode: 'api',
    fallbackToCopy: true,
    message: `${platform.toUpperCase()} uses Copy & Open natively right now.`,
  };
}
