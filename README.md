# asterisk (`*`)

> **Say it once. Let it travel.**  
> An open-source multi-platform writing & publishing app built with Next.js 16 (`cacheComponents`), SQLite (`better-sqlite3`), optional Clerk + Neon PostgreSQL (`profiles` & `hash_entries`), Three.js WebGL shaders, Framer Motion, and **Accént 3.0** (`playful-principal`).

**Live target:** [`asterisk.pipes.pink`](https://asterisk.pipes.pink) · **Source:** [`github.com/rorshockbtc/asterisk`](https://github.com/rorshockbtc/asterisk) · **Crafted by:** [`colonhyphenbracket.pink`](https://colonhyphenbracket.pink)

---

## Architecture & Routes

| Route | Purpose | Data & Auth |
|---|---|---|
| `/` | Editorial story (Three.js watercolor sky, 3-archetype horizon panorama, `*.post` explainer, weather reveal) + **live account-free browser demo** with up-to-4 image testing | Browser-only (`Copy & Open`) |
| `/colophon` | Art direction essay (**Print vs. Watercolor**: Guy Billout × Jean-Michel Folon), motif glossary, and 14-artist shortlist | Static + dedicated `og-colophon.png` |
| `/login` | Quiet Account Door handing off cleanly to **Pipes** onboarding or running locally via dev stub `/api/auth/stub` | Dual-mode: Clerk or local cookie |
| `/app` | Logged-in single-sheet composer: up to **4 image attachments** + **Pull from a Pipe**, live character/word sweet-spot meter, **Six Birds** channel tabs, custom **TopicPicker**, collapsible **Rhythm** popover, **Self-reply / First-comment** info box, and **Hash** journal drawer | Protected (`src/proxy.ts`); SQLite + Neon + Threads/X API |
| `/app/rooms` | Six painted spreads (`Threads`, `X`, `Facebook`, `Substack`, `Instagram`, `TikTok · Test Mode`) with 6 distinct paper-textured overlays + collapsed side-by-side matrix | Protected (`src/proxy.ts`) |
| `/app/setup` | Non-technical tap-by-tap creator walkthroughs + Birds-on-a-Wire progress + handle/rhythm editor + auto-publishing overview | Protected (`src/proxy.ts`) |
| `/studio/*` | Legacy path redirect forwarding cleanly to `/app/*` | Redirect (`next.config.ts`) |

---

## Quick Start (Zero Config)

Clone and run locally without any API keys or database setup:

```bash
git clone https://github.com/rorshockbtc/asterisk.git
cd asterisk
npm install
npm run dev
```

Open [http://localhost:3400](http://localhost:3400).

- `/` runs immediately in browser memory (including uploading images or sampling built-in Pipe visuals).
- Clicking **Log in** or **Sign up** enters `/app` locally using dev cookie `/api/auth/stub` whenever Clerk environment variables are unset.
- Local drafts, setup state, handles, and attachments persist in `./data/asterisk.db` (gitignored).

---

## Hosted Production Setup (Clerk + Neon + Pipes)

Copy `.env.example` to `.env.local` for production deployment on Vercel (`asterisk.pipes.pink`):

```bash
cp .env.example .env.local
```

1. **Clerk Validation (`src/lib/clerk-auth.ts` & `src/proxy.ts`):** When `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` are set, `OptionalClerkProvider` and `src/proxy.ts` validate sessions against Clerk and cross-check `profiles.clerk_id` in Neon PostgreSQL (`DATABASE_URL`).
2. **Hash Journal (`src/app/api/hash/route.ts`):** Reads and writes directly to Neon `hash_entries` (`id`, `clerk_id`, `title`, `content`, `writing_mode`, `is_private`, `tags`, `photo_urls`) when Clerk + `DATABASE_URL` are present.
3. **Pipes Visual Picker (`src/app/api/pipes/media/route.ts`):** Queries recent `hash_entries.photo_urls` and `nodes.payload` images so writers can pull media from Pipes into social posts in one click.
4. **Optional Direct API Publishing:** Set `THREADS_ACCESS_TOKEN` + `THREADS_USER_ID` or `X_ACCESS_TOKEN` in `.env.local` for 1-click direct publishing (Threads posts automatic `reply_to_id` self-replies; X chains sequential threads cleanly).

See [`PIPES_HANDOFF.md`](./PIPES_HANDOFF.md) for full Pipes & Clerk integration details.

---

## Scripts & Quality Verification

```bash
npm run dev      # Start Next.js 16 dev server on http://localhost:3400
npm run og       # Regenerate 1200x630 PNG OpenGraph cards (public/og/*) & touch icon
npm test         # Run unit tests (platform rules, multi-image checks, session guards, OG files)
npm run lint     # Run ESLint
npm run build    # Production Next.js build (Turbopack + cacheComponents)
```

---

## Documentation

- [`ART_DIRECTION.md`](./ART_DIRECTION.md) — Print vs. watercolor thesis, 14-artist shortlist, motif glossary, and surface motion budgets.
- [`PIPES_HANDOFF.md`](./PIPES_HANDOFF.md) — Clerk + Neon `profiles` / `hash_entries` contract & Pipes onboarding handoff.
- [`CASE_STUDY_AND_ACCENT_RETROSPECTIVE.md`](./CASE_STUDY_AND_ACCENT_RETROSPECTIVE.md) — Case study + upstream design system retrospective.
- [`ACCENT_GAP_REPORT.md`](./ACCENT_GAP_REPORT.md) — Technical audit of `accent-ui@1.0.0`.
- [`STYLES.md`](./STYLES.md) — `playful-principal` + Folon watercolor Style Control Plane.

---

## Licensing

- **Software source code** (`src/`, `scripts/`, `tests/`): Licensed under the **Apache License 2.0** ([`LICENSE`](./LICENSE) & [`NOTICE`](./NOTICE)).
- **Original watercolor artwork & brand marks** (`public/art/`, `public/og/`, Colon Hyphen Bracket, Pipes, Hash, asterisk): Reserved under [`LICENSE-ART.md`](./LICENSE-ART.md). You may inspect and run the unmodified repository locally; forks distributing derivative commercial products must substitute their own art and branding.
