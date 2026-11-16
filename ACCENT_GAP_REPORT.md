# Accént 3.0 Dogfooding & Upstream Gap Report (`accent-ui@1.0.0`)

**Consumer App:** `asterisk (*)` (`/Users/kendallkylecyree/Developer/asterisk`)  
**Target Dialect:** `playful-principal` (aligned with `colonhyphenbracket.pink` / `chb-corporate-site`)  
**Upstream Package Audited:** `accent-ui@1.0.0` (`/Users/kendallkylecyree/Developer/accent-ui`)

---

## Executive Summary

We installed `accent-ui@1.0.0` directly from `~/Developer/accent-ui` via `npm pack` (`vendor/accent-ui-1.0.0.tgz`) and dogfooded it inside a standalone Next.js 16 + Tailwind CSS v4 application (`asterisk`).

### What Worked Well Out of the Box
- **`MotionProvider`** (`src/components/motion/MotionProvider.tsx`) wrapped `LazyMotion` (`domMax`) + reduced-motion synchronization cleanly once placed behind a client wrapper (`src/components/AccentClientShell.tsx`).
- **`Eyebrow`** and **`FadeUp`** (`src/components/editorial-motion/AccentBrandMotion.tsx:73-245`) and **`AccentEditorialReveal`** (`src/components/editorial-motion/AccentEditorialReveal.tsx:21-44`) delivered authentic editorial choreography matching `chb-corporate-site`.
- **`AccentHairlineList` & `AccentHairlineItem`** (`src/components/ui/index.tsx:277-315`) enforced `card.no-nesting` with tabular `font-serif` numerals (`01`, `02`, …) and crisp `1px` rules.
- **`AccentResponsiveTable`** (`src/components/ui/index.tsx:328-397`) provided zero-overflow mobile `<dl>` reflow while staying a semantic `<table>` on `md+`.
- **`AccentInput`**, **`AccentIconButton`**, and **`Smile`** (`src/components/ui/index.tsx:115-206`, `AccentBrandMotion.tsx:250`) worked immediately with `44×44px` hit areas and `16px` mobile font sizing.

### Where `accent-ui` Fell Short & Required Workarounds in `asterisk`
Below is the exact line-by-line technical audit for the `accent-ui` agent so the upstream design system can fix these gaps for future apps.

---

## Detailed Line-by-Line Gap Findings

### 1. Packaging, RSC Boundaries & Bundle Hygiene

| # | Upstream File & Lines | Observed Issue | How `asterisk` Diverged / Worked Around It | Upstream Fix for `accent-ui` |
|---|---|---|---|---|
| **1A** | `tsup.config.ts:4-13` | `tsup` strips or omits a top-level `'use client';` directive in `dist/index.mjs`, and bundles all components (`MotionProvider`, `AccentDiffViewer`, `@orama/orama` hooks, etc.) into one barrel entry (`src/index.ts:1-11`). Importing `MotionProvider` directly in a Next.js App Router Server Component (`src/app/layout.tsx`) breaks unless wrapped. | Created `src/components/AccentClientShell.tsx` (`'use client'`) solely to re-export `<MotionProvider>`. | Add `banner: { js: "'use client';" }` for React client entrypoints in `tsup.config.ts`, or split server-safe `./tokens` / `./themes` from client `./motion` and `./ui` subpaths. |
| **1B** | `package.json:52-64` | `react`, `react-dom`, `next`, `framer-motion`, and `lucide-react` are listed in `"dependencies"` instead of `"peerDependencies"`. Installing `accent-ui` can duplicate React/Next or pull unintended runtime weights (`@orama/orama`, `diff`) even when an app only needs tokens + primitives. | Verified single React instance via tarball install; avoided heavy AI/diff modules. | Move `react`, `react-dom`, `next`, `framer-motion`, and `lucide-react` to `"peerDependencies"` (and `"devDependencies"`). Make `@orama/orama` and `diff` optional peer deps or isolated subpath exports (`accent-ui/ai`). |
| **1C** | `package.json:8-24` & Tailwind v4 | `accent-ui` ships zero CSS file or `@source` declaration for Tailwind CSS v4 consumers. Any downstream Tailwind v4 app that renders `AccentHairlineList`, `AccentResponsiveTable`, or `Eyebrow` will silently miss utility classes (`divide-y`, `border-[var(--a-rule)]`, `tabular-nums`, etc.) unless the consumer manually scans `node_modules`. | Added `@source "../../node_modules/accent-ui/dist";` at line 2 of `src/app/globals.css`. | Ship a `./styles.css` export containing `@source` / `.t-press` / `.t-color` / `--a-*` defaults and document `@import "accent-ui/styles.css";` in `README.md`. |
| **1D** | `src/components/ui/index.tsx:20` | `getButtonClasses` applies utility classes `.t-press` and `.t-color`, which are not built-in Tailwind classes and are not exported in any CSS bundle from `accent-ui`. | Manually recreated `.t-press` and `.t-color` CSS transitions in `src/app/globals.css:101-114`. | Export `.t-press` and `.t-color` inside `accent-ui/styles.css` (or inline Tailwind `transition-*` + `duration-*` utilities). |

---

### 2. `playful-principal` Dialect Parity & Token Gaps

| # | Upstream File & Lines | Observed Issue | How `asterisk` Diverged / Worked Around It | Upstream Fix for `accent-ui` |
|---|---|---|---|---|
| **2A** | `src/styles/themes.ts:224` | `BRAND_PROFILES['playful-principal'].tokens.light['--a-accent-fill']` is set to `#B81468` (dark magenta/burgundy), directly contradicting `chb-corporate-site/STYLES.md:10-12` and `chb-corporate-site/client/src/styles/accent.config.ts:108-125`, which explicitly mandate Sovereign Hot Pink **`#FE299E`** on filled pill CTAs (with `#111827` hover). On iPhone OLED displays, `#B81468` reads as burgundy instead of CHB pink. | Defined `--a-accent-fill: #FE299E;` and `--a-accent-fill-hover: #111827;` in `src/app/globals.css:15-16` and rendered pill CTAs directly with the CHB signature glow `shadow-[0_10px_30px_-10px_rgba(254,41,158,0.55)]`. | Update `themes.ts:224` (or add a documented `accentFillMode: 'brand-vibrant' | 'aa-darkened'`) so `playful-principal` matches `colonhyphenbracket.pink` out of the box without forcing downstream overrides. |
| **2B** | `src/styles/themes.ts:191-198` & `238-240` | `playful-principal` declares `display: 'Bricolage Grotesque'`, `serif: 'Newsreader'`, `sans: 'Inter'`, `mono: 'JetBrains Mono'` in metadata, **but** `tokens.light` (lines `238-240`) only emits `--a-font-display` and `--a-tracking-display`. It omits `--a-font-serif`, `--a-font-sans`, `--a-font-mono`, and `--a-leading-body`, and does not load Google Fonts or expose a Next.js font helper. | Loaded `Bricolage_Grotesque`, `Newsreader`, `Inter`, and `JetBrains_Mono` manually in `src/app/layout.tsx:1-29` and mapped all four in `@theme inline` (`src/app/globals.css:39-46`). | Emit `--a-font-serif`, `--a-font-sans`, `--a-font-mono`, and `--a-leading-body` on every `BrandProfile.tokens` object, plus provide an optional `accent-ui/next-fonts` helper or CSS `@theme` snippet. |
| **2C** | Tailwind v4 `text-xs` vs `STYLES.md:11` | `STYLES.md:11` mandates a **strict `13px` (`0.8125rem`) typographic floor**. However, `accent-ui` components (`Eyebrow` at `AccentBrandMotion.tsx:237`, `AccentBadge` at `ui/index.tsx:160`, `AccentResponsiveTable` at `ui/index.tsx:354`, `AccentField` at `ui/index.tsx:185`) all use Tailwind's `text-xs`, which compiles to `12px` (`0.75rem`) by default in Tailwind v4—silently violating Accént's own Layer 1 rule! | Added `--text-xs: 0.8125rem; --text-xs--line-height: 1.4;` inside `@theme inline` in `src/app/globals.css:47-48` so every `text-xs` from `accent-ui` renders at `13px`. | Either replace `text-xs` with `text-[13px]` in `accent-ui` components or require/export `--text-xs: 0.8125rem` in `accent-ui/styles.css`. |

---

### 3. Dead Anti-Pattern Components & Missing Editorial Primitives

| # | Upstream File & Lines | Observed Issue | How `asterisk` Diverged / Worked Around It | Upstream Fix for `accent-ui` |
|---|---|---|---|---|
| **3A** | `src/components/ui/button.tsx:26-38`, `card.tsx:4-19`, `badge.tsx:7`, `input.tsx:11` | `accent-ui` contains leftover shadcn boilerplate (`button.tsx`, `card.tsx`, `badge.tsx`, `input.tsx`) right alongside the real `Accent*` components in `ui/index.tsx`. Those leftover files violate Accént's own `STYLES.md`: `Button` uses `h-6`/`h-7`/`h-8` (`24px–32px` < `44px` touch floor) and `rounded-none`; `Input` is `h-8` (`32px`); `Card` encourages `ring-1` card clutter! | Did **not** import from `button.tsx`, `card.tsx`, `badge.tsx`, or `input.tsx`; strictly used `AccentInput`, `AccentIconButton`, `AccentHairlineList`, and `AccentResponsiveTable` from `ui/index.tsx` plus de-cardified hairline pedestals. | Remove or deprecate the leftover shadcn `button.tsx` / `card.tsx` / `badge.tsx` / `input.tsx` files (or upgrade them to `44px` targets, pill/dialect radius, and non-card posture) so agents don't accidentally generate card clutter when prompted to "use accent-ui". |
| **3B** | `src/components/ui/index.tsx:218-272` (`AccentTabs`) | `AccentTabs` hardcodes `grid-cols-4 sm:flex` (line `236`), which breaks when a product has **5 or 6 tabs** (our 6 social channels wrap or misalign into a 2-row grid on mobile `< 640px`), uses `font-semibold` only on active tabs (causing subtle horizontal width shift), lacks `ArrowLeft`/`ArrowRight`/`Home`/`End` roving keyboard support, and renders the active underline via Framer Motion `<m.span>` background (which disappears in Windows Forced Colors mode). | Built a semantic single-row scrolling tablist (`.asterisk-tablist` in `src/app/globals.css:122-146` + `StudioWorkspace.tsx:104-121, 270-310`) with constant `font-medium`, `ArrowLeft`/`ArrowRight`/`Home`/`End` keyboard navigation, `scrollIntoView`, and `::after { border-block-end: 2.5px solid var(--a-accent); }` (WCAG / `forced-colors` safe). | Update `AccentTabs` to support `layout?: '4-col' | 'scroll'`, add keyboard arrow navigation, remove font-weight jump on active state, and draw the underline using a border pseudo-element instead of background color alone. |
| **3C** | `src/components/ui/index.tsx` (Missing Form & Pedestal Primitives) | `accent-ui` provides `AccentInput` (`<input>`), but has **no `AccentTextarea`** (with `field-sizing: content`), **no `AccentSelect`** (`min-h-[44px]`), **no `AccentPedestal`** (`border-t`/`border-l` de-cardified section primitive), and **no `AccentArtSlot`** (editorial plate placeholder). | Built `.asterisk-textarea` (`field-sizing: content; width: 100%;`), `min-h-[44px]` `<select>`, architectural pedestals directly in `StudioWorkspace.tsx` / `PlaybooksView.tsx` / `SetupView.tsx`, and `ArtDirectionSlot.tsx` wrapping `AccentEditorialReveal`. | Add `AccentTextarea`, `AccentSelect`, `AccentPedestal`, and `AccentArtPlate` to `src/components/ui/index.tsx`. |
| **3D** | `src/components/ui/index.tsx:167-194` (`AccentField`) & `402-460` (`AccentSheet`) | `AccentField` does not propagate `aria-describedby` or `aria-invalid` to its child control, and `AccentSheet` builds a custom `<div role="dialog">` without focus trapping or native `<dialog>` top-layer semantics. | Kept explicit `<label htmlFor=...>` pairings and inline validation text in `asterisk`, and replaced `AccentSheet` with a native `<dialog closedby="any">` (`NotesDrawer.tsx`) carrying `overscroll-behavior: contain` and a Safari backdrop coordinate fallback. | Enhance `AccentField` with `React.cloneElement` or render-prop IDs for `aria-describedby`/`aria-errormessage`, and migrate `AccentSheet` to native `<dialog>` (`showModal()` / `closedby="any"`). |

---

### 4. Art, Motion & Surface Archetype Gaps (Pass-2 Folon Watercolor Findings)

| # | Upstream Area | Observed Gap | How `asterisk` Built Around It | Upstream Upgrade for `accent-ui` |
|---|---|---|---|---|
| **4A** | Surface Archetypes & Motion Budgets | `accent-ui` treats motion as two flat tiers (`editorial` vs `commercial`), giving agents no rule on *where* heavy scroll choreography belongs vs. where action-only calm is required. Pass 1 obeyed every token yet felt dry and clinical. | Split `asterisk` explicitly into `threshold` (heavy scroll choreography on `/`), `sanctuary` (action-only motion on `/studio`), and `gallery` (`/studio/rooms`, `/login`) documented in `STYLES.md` and `CASE_STUDY_AND_ACCENT_RETROSPECTIVE.md`. | Define official `SurfaceArchetype` profiles (`threshold`, `sanctuary`, `gallery`, `edition`) in `STYLES.md` and `themes.ts`. |
| **4B** | No Watercolor / Glaze / Shader Primitives | `accent-ui` only offers `AccentRevealImage` (a straight clip-path wipe). There is no multi-layer `multiply` glaze component, no interactive pigment-bloom button, no hand-drawn brush underline, and no progressive-fallback WebGL backdrop primitive. | Built `WatercolorDefs.tsx`, `WatercolorSky.tsx` (lazy Three.js shader + WebGL fallback + `IntersectionObserver` pause), `bloom.ts` + `.wc-cta` / `.wc-link` in `globals.css`, and `scripts/process-art.mjs` (white-point leveling without blowing out dark plates). | Add optional `accent-ui/art` primitives (`AccentGlazeLayer`, `AccentShaderBackdrop`, `AccentBloomButton`) honoring `useMotionPreference()`. |
| **4C** | No Atmospheric / Progressive-Disclosure Status | `AccentVerificationLedger` renders full tables/lists upfront, nudging apps toward 5-row lint dumps inside writing workflows. | Created `WeatherBand.tsx` + `src/lib/weather.ts`: leads with a crossfading painted sky state (*Overcast* / *Clearing* / *Clear skies*), shows only actionable fixes inline, and folds passes into `N clear ✓`. | Add a collapsible summary / atmospheric status pattern to `accent-ui` so tools don't crowd writers with passing checks. |
| **4D** | Corporate `link-swipe` Missing | `chb-corporate-site` uses `.link-swipe` for underline motion, which `accent-ui` neither exports nor adapts for softer watercolor contexts. | Authored `.wc-link` in `globals.css` using a repeating inline SVG brush stroke animated via `background-size`. | Export `.link-swipe` (print) and `.wc-link` (watercolor) in `accent-ui/styles.css`. |

---

## Summary Checklist for the `accent-ui` Agent

1. Fix `themes.ts:224` so `playful-principal` uses `#FE299E` for `--a-accent-fill` (matching `chb-corporate-site`) and emits `--a-font-serif`, `--a-font-sans`, `--a-font-mono`, and `--a-leading-body`.
2. Ship `accent-ui/styles.css` with `@source`, `.t-press`, `.t-color`, `.link-swipe`, `.wc-link`, and `--text-xs: 0.8125rem` (`13px` floor).
3. Split client/server tsup entrypoints with `'use client';` banners and move React/Next/Framer Motion to `peerDependencies`.
4. Delete or modernize `src/components/ui/{button,card,badge,input}.tsx` so `accent-ui` never nudges agents toward card clutter or `32px` buttons.
5. Upgrade `AccentTabs` (`scroll` overflow mode, `ArrowLeft/Right` navigation, `border-block-end` active indicator), migrate `AccentSheet` to native `<dialog>`, and add `AccentTextarea`, `AccentSelect` (custom styled listbox / `base-select` pill instead of OS default gray dropdowns), and `AccentPedestal`.
6. Introduce `SurfaceArchetype` motion budgets (`threshold` / `sanctuary` / `gallery` / `edition`) plus glaze/shader primitives so future `accent-ui` apps achieve editorial art direction, not just mathematical compliance.

---

### 5. Live Principal Dogfooding Addendum (Typography, Native Select & Anti-Anxiety UX)

Three additional UX lessons emerged directly during live walkthrough review of `asterisk`:

| # | Area | Observed Issue | How `asterisk` Resolved It | Upstream Lesson for `accent-ui` |
|---|---|---|---|---|
| **5A** | Eyebrows & `font-mono` Fatigue (`Eyebrow`, `AccentResponsiveTable`) | `Eyebrow` and table helpers in `accent-ui` apply `font-mono` (`JetBrains Mono`), which felt noisy and overly developer-centric on `asterisk`'s warm editorial canvas—especially on all-caps eyebrows and UI chrome. | Removed `JetBrains_Mono` from `src/app/layout.tsx`, remapped `--font-mono` to `var(--font-inter)` in `src/app/globals.css`, and switched eyebrows/counters to `Inter` (`tabular-nums` on numbers). | Offer `eyebrowFont: 'sans' | 'mono'` (defaulting to `'sans'` on `playful-principal`) rather than hardcoding `font-mono` inside `Eyebrow`. |
| **5B** | Missing Custom `AccentSelect` (`TopicPicker`) | Native `<select>` rendered with Chrome/macOS default black right-edge arrows and flat gray option popups that clashed with `#FAF8F5` paper and rounded watercolor controls. | Built `TopicPicker.tsx` as a custom ARIA `listbox` pill (`role="listbox"`, tight Lucide `ChevronDown`, `#FFFFFF` / `#FAF8F5` popup surface, `#F3EEE6` hover, `#FE299E` active checkmark, keyboard arrows + Escape). | Prioritize shipping a styled `AccentSelect` / `AccentListbox` primitive in `ui/index.tsx` so apps never fall back to OS `<select>` menus. |
| **5C** | Persistent "Never posted" Bar Anxiety | A full-width persistent header strip showing red/pink `"Never posted"` badges across 5 channels on first visit creates immediate streak-shame and visual stress inside a calm writing workspace. | Replaced the persistent cadence strip in `StudioShell.tsx` with a collapsible `Rhythm` `<details>` popover and calm wording (`Ready` / `Shared today` / `Nd quiet`). | Add an optional quiet collapsible disclosure pattern for telemetry/streak summaries so first-time users never greet a wall of red "0 / Never" warnings. |
