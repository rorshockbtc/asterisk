/**
 * Session & Pipes ecosystem constants and helpers.
 *
 * Dual-mode:
 * - Hosted on pipes.pink / Clerk configured: delegates to Clerk + cross-subdomain Pipes endpoints.
 * - Localhost without secrets: uses `/api/auth/stub` (`SESSION_COOKIE`) and local SQLite.
 */
export const SESSION_COOKIE = 'asterisk_session';
export const GITHUB_REPO_URL = 'https://github.com/rorshockbtc/asterisk';

export const PIPES_ORIGIN =
  process.env.NEXT_PUBLIC_PIPES_URL?.replace(/\/+$/, '') || 'https://pipes.pink';

export const PIPES_SIGNUP_URL = `${PIPES_ORIGIN}/asterisk?ref=asterisk`;
export const PIPES_DIRECT_SIGNIN_URL = `${PIPES_ORIGIN}/sign-in?ref=asterisk`;
export const PIPES_DESK_URL = `${PIPES_ORIGIN}/my-pipes`;
export const PIPES_HASH_URL = `${PIPES_ORIGIN}/write`;

export function getPipesAuthUrl(intent: 'login' | 'signup' = 'login', nextPath = '/app'): string {
  const base =
    process.env.NEXT_PUBLIC_PIPES_AUTH_URL ||
    (intent === 'signup'
      ? process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || PIPES_SIGNUP_URL
      : process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || PIPES_SIGNUP_URL);

  try {
    const u = new URL(base);
    if (!u.searchParams.has('ref')) u.searchParams.set('ref', 'asterisk');
    u.searchParams.set('source', 'asterisk');
    u.searchParams.set('intent', intent);
    u.searchParams.set('return_to', safeNextPath(nextPath, '/app'));
    return u.toString();
  } catch {
    return PIPES_SIGNUP_URL;
  }
}

export function isStubAuthEnabled(): boolean {
  return process.env.NODE_ENV !== 'production' || process.env.ASTERISK_AUTH_STUB === '1';
}

/** Only allow same-origin relative redirect targets (prevents open redirects). */
export function safeNextPath(raw: string | null | undefined, fallback = '/app'): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) {
    return fallback;
  }
  return raw;
}
