import { splitIntoXThread, type PlatformId } from '../platforms';
import type {
  OAuthPlatform,
  PlatformConnectionRecord,
  PublicPlatformConnection,
} from '../oauth-connections';

export interface PublishAttemptResult {
  ok: boolean;
  mode: 'copy' | 'api';
  fallbackToCopy?: boolean;
  externalUrl?: string;
  message: string;
}

export function getApiConnectionStatus(
  connections?: Partial<Record<OAuthPlatform, PublicPlatformConnection>>
): Record<PlatformId, { configured: boolean; note: string; handle?: string | null }> {
  const threadsOAuth = connections?.threads?.connected;
  const xOAuth = connections?.x?.connected;
  const fbOAuth = connections?.facebook?.connected;
  const igOAuth = connections?.instagram?.connected;

  const threadsReady = Boolean(
    threadsOAuth || (process.env.THREADS_ACCESS_TOKEN && process.env.THREADS_USER_ID)
  );
  const xReady = Boolean(xOAuth || process.env.X_ACCESS_TOKEN);
  const fbReady = Boolean(fbOAuth);
  const igReady = Boolean(igOAuth);

  return {
    threads: {
      configured: threadsReady,
      handle: connections?.threads?.accountHandle ?? null,
      note: threadsOAuth
        ? `Connected as ${connections?.threads?.accountHandle || 'Threads account'}`
        : threadsReady
          ? 'Threads Graph API live (env token)'
          : 'Not connected — connect in Setup or use Copy & Open',
    },
    x: {
      configured: xReady,
      handle: connections?.x?.accountHandle ?? null,
      note: xOAuth
        ? `Connected as ${connections?.x?.accountHandle || 'X account'}`
        : xReady
          ? 'X API v2 live (env token)'
          : 'Not connected — connect in Setup or use Copy & Open',
    },
    facebook: {
      configured: fbReady,
      handle: connections?.facebook?.accountHandle ?? null,
      note: fbReady
        ? `Connected Page: ${connections?.facebook?.accountHandle || 'Facebook Page'}`
        : 'Not connected — connect Facebook Page in Setup',
    },
    substack: {
      configured: false,
      note: 'Substack has no public posting API — uses Copy & Open',
    },
    instagram: {
      configured: igReady,
      handle: connections?.instagram?.accountHandle ?? null,
      note: igReady
        ? `Connected as ${connections?.instagram?.accountHandle || 'Instagram'} (requires image)`
        : 'Not connected — connect via Meta in Setup (requires image)',
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
  connection,
  imageUrl,
}: {
  platform: PlatformId;
  bodyText: string;
  replyText?: string;
  mode: 'copy' | 'api';
  connection?: PlatformConnectionRecord | null;
  imageUrl?: string;
}): Promise<PublishAttemptResult> {
  if (mode === 'copy') {
    return {
      ok: true,
      mode: 'copy',
      message: `Marked ${platform.toUpperCase()} as posted via Copy & Open.`,
    };
  }

  if (platform === 'threads') {
    const token = connection?.access_token || process.env.THREADS_ACCESS_TOKEN;
    const userId = connection?.account_id || process.env.THREADS_USER_ID;
    if (!token || !userId) {
      return {
        ok: false,
        mode: 'api',
        fallbackToCopy: true,
        message: 'Threads is not connected yet — connect in Setup or use Copy & Open Threads.',
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
    const token = connection?.access_token || process.env.X_ACCESS_TOKEN;
    if (!token) {
      return {
        ok: false,
        mode: 'api',
        fallbackToCopy: true,
        message: 'X is not connected yet — connect in Setup or use Copy & Open X.',
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

  if (platform === 'facebook') {
    const token = connection?.access_token;
    const pageId = connection?.account_id;
    if (!token || !pageId) {
      return {
        ok: false,
        mode: 'api',
        fallbackToCopy: true,
        message: 'Facebook Page is not connected yet — connect via Meta in Setup.',
      };
    }

    const res = await fetch(`https://graph.facebook.com/v21.0/${encodeURIComponent(pageId)}/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: bodyText, access_token: token }),
      signal: AbortSignal.timeout(10000),
    });
    const data = (await res.json()) as { id?: string; error?: { message?: string } };
    if (!res.ok || !data.id) {
      return {
        ok: false,
        mode: 'api',
        fallbackToCopy: true,
        message: `Facebook Page error: ${data.error?.message || res.status}`,
      };
    }

    return {
      ok: true,
      mode: 'api',
      externalUrl: `https://www.facebook.com/${data.id}`,
      message: 'Published directly to your Facebook Page!',
    };
  }

  if (platform === 'instagram') {
    const token = connection?.access_token;
    const igUserId = connection?.account_id;
    if (!token || !igUserId) {
      return {
        ok: false,
        mode: 'api',
        fallbackToCopy: true,
        message: 'Instagram is not connected yet — connect via Meta in Setup.',
      };
    }
    if (!imageUrl) {
      return {
        ok: false,
        mode: 'api',
        fallbackToCopy: true,
        message: 'Instagram requires an image URL to publish via API — attach an image or use Copy & Open.',
      };
    }

    const createRes = await fetch(
      `https://graph.facebook.com/v21.0/${encodeURIComponent(igUserId)}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: imageUrl, caption: bodyText, access_token: token }),
        signal: AbortSignal.timeout(10000),
      }
    );
    const createJson = (await createRes.json()) as { id?: string; error?: { message?: string } };
    if (!createRes.ok || !createJson.id) {
      return {
        ok: false,
        mode: 'api',
        fallbackToCopy: true,
        message: `Instagram container error: ${createJson.error?.message || createRes.status}`,
      };
    }

    const pubRes = await fetch(
      `https://graph.facebook.com/v21.0/${encodeURIComponent(igUserId)}/media_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creation_id: createJson.id, access_token: token }),
        signal: AbortSignal.timeout(10000),
      }
    );
    const pubJson = (await pubRes.json()) as { id?: string; error?: { message?: string } };
    if (!pubRes.ok || !pubJson.id) {
      return {
        ok: false,
        mode: 'api',
        fallbackToCopy: true,
        message: `Instagram publish error: ${pubJson.error?.message || pubRes.status}`,
      };
    }

    return {
      ok: true,
      mode: 'api',
      externalUrl: 'https://www.instagram.com/',
      message: 'Published directly to Instagram!',
    };
  }

  return {
    ok: false,
    mode: 'api',
    fallbackToCopy: true,
    message: `${platform.toUpperCase()} uses Copy & Open natively right now.`,
  };
}
