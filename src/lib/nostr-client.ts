'use client';

export interface NostrSignedEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

declare global {
  interface Window {
    nostr?: {
      getPublicKey: () => Promise<string>;
      signEvent: (event: {
        kind: number;
        created_at: number;
        tags: string[][];
        content: string;
      }) => Promise<NostrSignedEvent>;
    };
  }
}

const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.nostr.band',
];

async function fetchNostrProfile(pubkey: string): Promise<{ name?: string; picture?: string }> {
  return new Promise((resolve) => {
    try {
      const ws = new WebSocket('wss://relay.damus.io');
      const subId = `p_${Math.random().toString(36).slice(2, 8)}`;
      const timer = setTimeout(() => {
        ws.close();
        resolve({});
      }, 2500);
      ws.onopen = () => {
        ws.send(JSON.stringify(['REQ', subId, { kinds: [0], authors: [pubkey], limit: 1 }]));
      };
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(String(ev.data));
          if (Array.isArray(msg) && msg[0] === 'EVENT' && msg[2]?.content) {
            const meta = JSON.parse(msg[2].content) as {
              display_name?: string;
              name?: string;
              nip05?: string;
              picture?: string;
            };
            clearTimeout(timer);
            ws.close();
            resolve({
              name: meta.display_name || meta.name || meta.nip05,
              picture: meta.picture,
            });
          } else if (Array.isArray(msg) && msg[0] === 'EOSE') {
            clearTimeout(timer);
            ws.close();
            resolve({});
          }
        } catch {
          // ignore
        }
      };
      ws.onerror = () => {
        clearTimeout(timer);
        resolve({});
      };
    } catch {
      resolve({});
    }
  });
}

export async function connectNostrExtension(): Promise<{
  ok: boolean;
  handle?: string;
  picture?: string;
  error?: string;
}> {
  if (typeof window === 'undefined' || !window.nostr) {
    return {
      ok: false,
      error: 'No Nostr extension found. Install Alby, nos2x, or Flamingo and reload.',
    };
  }

  try {
    const pubkey = await window.nostr.getPublicKey();
    const profile = await fetchNostrProfile(pubkey);
    const res = await fetch('/api/auth/nostr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pubkey, name: profile.name, picture: profile.picture }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data.error || 'Failed to save Nostr pubkey' };
    }
    return { ok: true, handle: data.handle, picture: profile.picture };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Nostr authorization rejected',
    };
  }
}

export async function publishNostrNote(content: string): Promise<{ ok: boolean; message: string }> {
  if (typeof window === 'undefined' || !window.nostr) {
    return { ok: false, message: 'No Nostr extension found (Alby / nos2x).' };
  }

  try {
    const unsigned = {
      kind: 1,
      created_at: Math.floor(Date.now() / 1000),
      tags: [] as string[][],
      content,
    };
    const signed = await window.nostr.signEvent(unsigned);

    const results = await Promise.all(
      DEFAULT_RELAYS.map(
        (relayUrl) =>
          new Promise<boolean>((resolve) => {
            try {
              const ws = new WebSocket(relayUrl);
              const timer = setTimeout(() => {
                ws.close();
                resolve(false);
              }, 4500);
              ws.onopen = () => {
                ws.send(JSON.stringify(['EVENT', signed]));
              };
              ws.onmessage = (ev) => {
                try {
                  const msg = JSON.parse(String(ev.data));
                  if (Array.isArray(msg) && msg[0] === 'OK') {
                    clearTimeout(timer);
                    ws.close();
                    resolve(Boolean(msg[2]));
                  }
                } catch {
                  // ignore
                }
              };
              ws.onerror = () => {
                clearTimeout(timer);
                resolve(false);
              };
            } catch {
              resolve(false);
            }
          })
      )
    );

    const okCount = results.filter(Boolean).length;
    return okCount > 0
      ? { ok: true, message: `Published to ${okCount}/${DEFAULT_RELAYS.length} Nostr relays!` }
      : { ok: false, message: 'Signed Nostr note, but relays did not confirm.' };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'Nostr signing failed',
    };
  }
}
