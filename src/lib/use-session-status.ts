'use client';

import { useEffect, useState } from 'react';
import { fetchPipesSession } from '@/lib/pipes-client';

interface ClerkGlobal {
  loaded?: boolean;
  user?: { id?: string } | null;
  addListener?: (cb: (resources: { user?: { id?: string } | null }) => void) => () => void;
}

export interface SessionStatus {
  loading: boolean;
  authenticated: boolean;
  pipesSignedIn: boolean;
}

/**
 * Detects whether the visitor already has an active Asterisk or Pipes session
 * so marketing headers/CTAs can show "Go to App →" and `/login` can redirect
 * straight into the workspace without redundant sign-in prompts.
 */
export function useSessionStatus(): SessionStatus {
  const [status, setStatus] = useState<SessionStatus>({
    loading: true,
    authenticated: false,
    pipesSignedIn: false,
  });

  useEffect(() => {
    let cancelled = false;
    let unsubscribeClerk: (() => void) | undefined;
    let pollTimer: ReturnType<typeof setInterval> | undefined;

    const checkEndpoints = async () => {
      try {
        const res = await fetch('/api/auth/session', { cache: 'no-store' });
        if (res.ok) {
          const data = (await res.json()) as { authenticated?: boolean };
          if (!cancelled && data.authenticated) {
            setStatus({ loading: false, authenticated: true, pipesSignedIn: true });
            return true;
          }
        }
      } catch {
        // Ignore network errors and continue checking Clerk / Pipes
      }

      try {
        const pipes = await fetchPipesSession();
        if (!cancelled && pipes?.authenticated) {
          setStatus((prev) => ({
            loading: false,
            authenticated: prev.authenticated,
            pipesSignedIn: true,
          }));
          return false;
        }
      } catch {
        // Ignore cross-origin errors
      }

      if (!cancelled) {
        setStatus((prev) => ({ ...prev, loading: false }));
      }
      return false;
    };

    void checkEndpoints();

    const attachClerkListener = () => {
      const clerk = (window as unknown as { Clerk?: ClerkGlobal }).Clerk;
      if (!clerk) return false;

      if (clerk.user?.id) {
        if (!cancelled) {
          setStatus({ loading: false, authenticated: true, pipesSignedIn: true });
        }
      }

      if (typeof clerk.addListener === 'function') {
        unsubscribeClerk = clerk.addListener((resources) => {
          if (cancelled) return;
          if (resources.user?.id) {
            setStatus({ loading: false, authenticated: true, pipesSignedIn: true });
          }
        });
      }
      return Boolean(clerk.loaded);
    };

    if (!attachClerkListener()) {
      let ticks = 0;
      pollTimer = setInterval(() => {
        ticks += 1;
        if (attachClerkListener() || ticks > 25) {
          if (pollTimer) clearInterval(pollTimer);
        }
      }, 200);
    }

    return () => {
      cancelled = true;
      if (unsubscribeClerk) unsubscribeClerk();
      if (pollTimer) clearInterval(pollTimer);
    };
  }, []);

  return status;
}
