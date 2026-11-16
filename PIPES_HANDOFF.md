# Pipes ↔ Asterisk (`*`) Backend, Auth & Two-Way Bridge Specification

This document tracks the implemented two-way integration between **`asterisk` (`asterisk.pipes.pink`)**, **`pipes-unified` (`pipes.pink`)**, **`hash` (`#`)**, and **`accent-ui@1.1.0`** (`vendor/accent-ui-1.1.0.tgz`).

---

## 1. Two-Way Integration Implemented (`src/lib/session.ts`, `src/lib/pipes-client.ts`)

1. **Outbound Sign-up / Funnel Links (`rel="noopener"` + `?ref=asterisk`):**
   - `PIPES_ORIGIN = process.env.NEXT_PUBLIC_PIPES_URL || 'https://pipes.pink'`
   - `PIPES_SIGNUP_URL = ${PIPES_ORIGIN}/asterisk?ref=asterisk`
   - `PIPES_DIRECT_SIGNIN_URL = ${PIPES_ORIGIN}/sign-in?ref=asterisk`
   - `PIPES_DESK_URL = ${PIPES_ORIGIN}/my-pipes`
   - `PIPES_HASH_URL = ${PIPES_ORIGIN}/write`
   - All outbound links targeting `pipes.pink` in `LoginDoor.tsx`, `SiteFooter.tsx`, `NotesDrawer.tsx`, and `StudioShell.tsx` use `target="_blank" rel="noopener"` (intentionally preserving `Referer` for `pipes.pink/src/middleware.ts`).

2. **Shared Cross-Subdomain Session (`fetchPipesSession()` -> `GET ${PIPES_ORIGIN}/api/auth/session`):**
   - Sends `credentials: 'include'` on mount in `StudioContext.tsx` to hydrate `user.handle`, `user.personalPipe`, `personalPipeUrl`, `hashVaultUrl`, and `myDeskUrl`.

3. **Save to `# Hash` & `Publish to Personal Pipe` (`saveDraftToPipes()` -> `POST ${PIPES_ORIGIN}/api/hash/entries`):**
   - **Save to `# Hash`**: Calls `POST /api/hash` locally (or Neon `hash_entries` directly if configured) AND sends `saveDraftToPipes({ title, content, writingMode: 'quick', source: 'asterisk', channels, publishToPersonalPipe: false, tags })` with `credentials: 'include'`. Returns clickable **"Extend in # Hash ↗"** (`extendInHashUrl`) or fallback Sign-in / Draft URL when unauthenticated.
   - **Publish to Personal Pipe (`pipe\<handle>` popover in `CalmStudio.tsx`)**: Calls `saveDraftToPipes({ ..., publishToPersonalPipe: true, extensionNote })`, returning clickable **"View pipe\\<handle> ↗"** (`publishedUrl`) + **"Extend in # Hash ↗"** (`extendInHashUrl`).

4. **Inbound Deep Links ("Post to Social `*`"):**
   - Queries `/app?draft=...&sourceTitle=...&sourceUrl=...&pipe=...&from=pipes` (and legacy `/studio?...` redirects + `proxy.ts` query-preserving login redirect) hydrate cleanly via `adaptInboundFromPipes()` (`src/lib/pipes-client.ts`):
     - **Threads & Facebook**: keeps `body_text` link-free and places `sourceUrl` safely inside `Link: ...` self-reply / first-comment slot.
     - **X & Substack Notes**: keeps `sourceUrl` cleanly available in `body_text`.
     - **Non-destructive guard**: auto-hydrates empty sheets or offers a **"Load draft / Keep current"** bar if the writer already has unsaved copy open.

---

## 2. Clerk + Neon `profiles` Validation (`src/lib/clerk-auth.ts` & `src/proxy.ts`)

- **`src/components/OptionalClerkProvider.tsx`**: Wraps `<ClerkProvider>` automatically when `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is set (acting as a zero-key passthrough on local clones).
- **`src/proxy.ts`**: Runs `clerkMiddleware()` when Clerk keys are configured, or falls back to `asterisk_session` cookie on localhost, always preserving full pathname + search query (`buildReturnPath`) across redirects.
- **`validateClerkMember()`**: Verifies Clerk `userId` and checks `profiles` in Neon (`SELECT id, clerk_id AS "clerkId", email, tier, realtime_alias AS "realtimeAlias" FROM profiles WHERE clerk_id = $1 LIMIT 1`).

### Production Environment Variables (Vercel)
```bash
NEXT_PUBLIC_SITE_URL=https://asterisk.pipes.pink
NEXT_PUBLIC_PIPES_URL=https://pipes.pink
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_CLERK_IS_SATELLITE=true
NEXT_PUBLIC_CLERK_DOMAIN=asterisk.pipes.pink
NEXT_PUBLIC_CLERK_SIGN_IN_URL=https://pipes.pink/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=https://pipes.pink/sign-up
NEXT_PUBLIC_PIPES_AUTH_URL=https://pipes.pink/asterisk?ref=asterisk
DATABASE_URL=postgresql://...
ASTERISK_REQUIRE_PROFILES_ROW=1
```

*(For local dual-server testing alongside `pipes-unified` on port `3002`, set `NEXT_PUBLIC_PIPES_URL=http://localhost:3002` in `.env.local`.)*
