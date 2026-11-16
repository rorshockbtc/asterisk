# Case Study & Design System Retrospective: asterisk (`*`) and Accént

> **Audience:** Portfolio readers (founders, design leaders, engineers) and upstream contributors to `accent-ui`.  
> **Scope:** How one solo-built web app went from a generic card dashboard, through literal design-system compliance, into a living watercolor product—and what that taught us about making design systems teach taste, not just tokens.

---

## Part I — Product, UX & Art Direction (Portfolio Case Study)

### 1. The Problem Worth Solving

If you build software or write independently, your natural audience is scattered across rooms you barely know how to talk to:

- **X** rewards sharp receipts, crisp UI screenshots, and short posts (`< 260` characters) or tight numbered threads.
- **Threads** rewards conversational questions—and quietly throttles any main post containing an external URL unless you move that link into an immediate self-reply.
- **Facebook** reaches warm, real-world connections who tune out developer jargon and expect links in the first comment.
- **Substack Notes** welcomes thoughtful paragraphs and direct links.
- **Instagram** refuses text-only posts and crops landscape `16:9` screenshots unless framed at `4:5`—and many builders' only existing account is tied to an old personal project.
- **TikTok** demands vertical `9:16` video; re-cutting desktop `16:9` demos on launch day is pure friction.

Most social tools solve this by becoming noisy B2B schedulers packed with calendars, AI "rewrite in 12 tones" buttons, and card grids. **asterisk (`*`)** solves the opposite problem: write **once** in your own voice, translate cleanly across six rooms without tripping over invisible platform rules, and stay aware of your cadence—without clutter, tracking, or losing authorship.

Even the name carries the product: in code, `*` is a **wildcard** (`*.post` matches every room); in prose, it is a **footnote** promising more depth; in C, it is a **pointer** to where the real thing lives.

---

### 2. Three Iterations in One Day: Why "Compliant" Still Looked Like a Tool

Building `asterisk` across three distinct passes exposed a sharp lesson about AI-assisted product design:

| Iteration | Posture | What Improved | Where It Still Failed |
|---|---|---|---|
| **Pass 0 — Scaffold** | Generic SaaS cards | Working SQLite persistence, X thread splitter, Threads link extractor. | White/slate card boxes, `11px` labels, hardcoded personal defaults, no cohesive brand voice. |
| **Pass 1 — Mechanical Compliance** | Strict `accent-ui` Layer 1 | Enforced `playful-principal` palette (`#FAF8F5`, `#FE299E`), `13px` floor, `44px` hit targets, `1px` hairlines, zero nested cards. | **Still felt like a specification sheet.** Two dense side-by-side columns, a 5-row lint checklist under the editor, long text playbooks, and a comparison table upfront. |
| **Pass 2 — Living Editorial Tool** | Folon watercolor + Surface Archetypes | Separated the choreographed **Marketing Story + Account-Free Demo** (`/`) from a calm single-sheet **Writing Studio** (`/studio`), painted **Six Rooms** (`/studio/rooms`), **Birds-on-a-Wire Setup** (`/studio/setup`), **Pipes Door** (`/login`), and **Colophon** (`/colophon`). | Required new primitives and motion governance that `accent-ui` did not yet provide. |

Pass 1 was the wake-up call: you can obey every contrast ratio, spacing multiple, and hairline rule in `STYLES.md` and still ship an interface that feels like homework.

What turned Pass 1 into Pass 2 was replacing **UI chrome** with **storytelling metaphors**:

1. **Saved drafts left the main screen.** Instead of a permanent left column fighting the writing surface, drafts live in a native `<dialog>` drawer (`Notes (N)`), leaving one serene writing sheet up to `54rem` wide.
2. **Channel tabs became six birds on a horizon.** On `HorizonTabs`, selecting a room lifts its painted bird off the ink horizon while keeping semantic WAI-ARIA `tablist` keyboard navigation intact.
3. **The 5-row Pre-Flight lint list became sky weather.** `WeatherBand` leads with a painted atmospheric state (*Blank page*, *Overcast*, *Clearing*, *Clear skies*) and hides passing checks behind progressive disclosure (`3 clear ✓ · show`), surfacing only actionable problems by default.
4. **Publishing gained a physical farewell.** Tapping *Copy & open* or *Publish* folds a two-frame wash-winged envelope (`WingedEnvelope` + `EnvelopeFlight`) off the button and sends it upward across the screen.
5. **Playbooks became an illustrated gallery.** `/studio/rooms` pairs six original portrait paintings with three crisp rules and one button (*Write for Threads →*), tucking the full matrix inside a collapsed `<details>` ("Compare all six side-by-side").

---

### 3. Art Direction: Print vs. Watercolor (Billout & Folon)

Colon Hyphen Bracket's corporate site (`colonhyphenbracket.pink`) pairs bold grotesque typography (`Bricolage Grotesque`) with **Guy Billout's** engineered, crisp surrealist plates. That site behaves like **printmaking**: rigid, repeatable, architectural.

For `asterisk`, we kept the exact typographic spine (Bricolage Grotesque, Newsreader, Inter, JetBrains Mono) and chose **watercolor** as its deliberate opposite—the visual equivalent of pairing a serif with a sans-serif. Print is rigid; watercolor bleeds, drifts, and responds to the reader's hand.

**Jean-Michel Folon** (Belgium) became the guiding influence because he spent his career painting **messages in flight**: winged envelopes, birds, arrows, open windows, and small hatted silhouettes facing vast dawn horizons. His violet-to-peach-to-pink skies also hold Colon Hyphen Bracket's Sovereign Pink (`#FE299E`) naturally as dawn pigment rather than a loud UI sticker.

> Every plate in `asterisk` is an **original composition made "after Folon"**—never copied, traced, or reconstructed from existing Folon works, and without reproduced signatures.

Equally important was curatorial restraint across a **14-artist shortlist** documented on `/colophon` and in `ART_DIRECTION.md`:

- **Ikko Tanaka** (2nd) and **Antonio Frasconi** (3rd) were strong runners-up, set aside because woodblock geometry fought organic motion and heavy dark tones strained animation clarity.
- **Saul Bass** was explicitly reserved for a future print-led site.
- **Josef & Anni Albers**, **Giorgio Morandi**, **Saul Steinberg**, **Bruno Munari**, **Piero Fornasetti**, **Paul Cox**, **Tadanori Yokoo**, **Ben Shahn**, and **Charley Harper** were ruled out where abstract theory, human faces, New Yorker familiarity, or visual chaos would compete with the writer's own words.

During production, reviewing Round 1 plates caught two subtle flaws before Round 2 scaled across all six Rooms:

- **No Magritte mix-ups:** Round 1 gave the standing figure a bowler hat—too close to René Magritte. Round 2 switched every figure to a soft fedora brim.
- **Poster restraint over greeting-card ornament:** Round 1's envelope had delicate feather line-work that read like stationery; Round 2 replaced it with translucent pink-and-violet wash wings, and introduced a two-frame flap cycle (`layer-envelope-up` / `layer-envelope-down`).

---

### 4. Product vs. Studio Attribution (The "Pipes" Dance)

`asterisk` wears two hats: it is a real tool designed to live on `asterisk.pipes.pink` (driving sign-ups to **Pipes**), and it is a calling card for **Colon Hyphen Bracket**'s design craft. Conflating those two CTAs confuses visitors.

The solution is strict **lane separation**:

- **Product lane (header, hero, public demo, `/login`):** *Try the demo* (account-free, browser-local Copy & Open) → *Sign up with Pipes* (`pipes.pink`, unlocking saved drafts, cadence tracking, and direct Threads/X publishing).
- **Studio lane (bottom dark band & `/colophon`):** *Designed & built by Colon Hyphen Bracket → Work with the studio* (`colonhyphenbracket.pink/contact`) plus the full art-direction essay.

---

## Part II — Technical Craft & Improving Accént (`accent-ui`)

### 1. Why Design Systems Yield "Dry Compliance"

Handing an AI agent `accent-ui@1.0.0` produced an accessible, consistent Pass 1—and exposed a blind spot in how design systems are written today. Accént enforced **floor invariants** (`13px` minimum text, `44×44px` touch targets, hairline dividers over nested cards, WCAG contrast) and **archival primitives** (`AccentHairlineList`, `AccentResponsiveTable`), yet gave no guidance on **surface pacing, emotional range, or progressive disclosure**.

Without knowing *when* a surface is a story, a sanctuary, or a gallery, an agent defaults to displaying every control, rule, and table simultaneously.

### 2. Concrete Upgrades Proposed for Accént 3.1 / 4.0

1. **Declare Four Surface Archetypes with Distinct Motion Budgets**  
   Add a formal `SurfaceArchetype` concept to `STYLES.md` and `themes.ts`:
   - `threshold` (marketing `/` & `/colophon`): heavy scroll-choreographed storytelling (rising sun, pinned glob explainer, horizontal panorama).
   - `sanctuary` (active writing `/studio`): zero scroll-jacking; motion responds *only* to user actions (focus wash, bird perch, weather crossfade, envelope flight).
   - `gallery` (`/studio/rooms`, `/login`): full-bleed plates paired with generous prose and subtle hover/ambient breath.
   - `edition` (long-form essays): calm archival reading spine.

2. **Ship Expressive Art & Material Primitives (`accent-ui/art`)**
   - `AccentGlazeLayer` + white-point leveling recipe (`mix-blend-mode: multiply` over paper canvas).
   - `AccentShaderBackdrop` wrapping lazy-loaded Three.js shader planes with DPR caps (`<= 1.5`), `IntersectionObserver` offscreen pausing, reduced-motion single-frame freezes, and automatic raster fallback.
   - `AccentBloomButton` (`.wc-cta`) setting pointer/focus origin CSS variables (`--bx`, `--by`) so hover/focus blooms organically from the user's cursor or keyboard focus.
   - Export `.wc-link` (and corporate `.link-swipe`) directly in a shipped `accent-ui/styles.css` alongside `.t-press`, `.t-color`, and `@source`.

3. **Build Progressive Disclosure into Feedback Components**  
   Replace multi-row validation checklists with atmospheric summary bands (`WeatherBand` pattern): lead with a plain-English readiness signal, surface *only* warnings inline with 1-click fixes, and collapse passing checks (`3 clear ✓`).

4. **Fix Upstream Packaging & Form/Tab Gaps Logged in `ACCENT_GAP_REPORT.md`**  
   - Add `'use client';` banners to client bundles (`tsup.config.ts`), move React/Next/Framer Motion to `peerDependencies`, and fix `playful-principal`'s OLED-safe `#FE299E` `--a-accent-fill` parity.
   - Export `AccentTextarea` (`field-sizing: content`), `AccentSelect`, a single-row scrolling `AccentTabs` with `border-block-end` indicators (`forced-colors` safe), and migrate `AccentSheet` to native `<dialog closedby="any">`.

---

### 3. Under the Hood (Technical Architecture)

- **Living Sky Shader (`src/art/WatercolorSky.tsx`):** Dynamic `import('three')` inside a lazy `useEffect`, rendering a single full-bleed quad with 5-octave domain-warped fbm noise (`q`, `r`, `warp`), wet-edge band pooling, paper tooth granulation, pointer repulsion, and scroll-driven dawn warmth. Automatically freezes to a single still frame under `prefers-reduced-motion` or Accént's `MotionToggle`, pauses offscreen via `IntersectionObserver`, and falls back to `hero-sky-bold.webp` if WebGL is unavailable.
- **Glaze Pipeline (`scripts/process-art.mjs`):** Uses `sharp` to compute each plate's 98th-percentile paper tone, level `layer-*` cutouts strictly to `#FFFFFF` for invisible `multiply` compositing, **and protect dark full-bleed paintings** (such as `room-tiktok.webp`, whose brightest pixels sit at luminance `208`) from white-point blowouts before generating responsive WebP sizes (`public/art/*.webp`).
- **Next.js 16 Auth Seam & Cache Components (`src/proxy.ts`, `src/lib/session.ts`):** Protects `/studio/:path*` (redirecting to `/login?next=…`) and `/api/{studio,publish,setup,hash}/:path*` (returning `401` unless a session cookie is present), preventing public visitors from hitting server SQLite or OAuth keys. `useSearchParams()` views (`/login`, `/studio`) sit inside `<Suspense>` boundaries so `cacheComponents: true` prerenders cleanly. All auth verification is isolated in `session.ts` and `/api/auth/*` so Pipes OAuth can drop straight in.
- **Modern Web Standards Compliance:** Single-row scrolling `HorizonTabs` (`role="tablist"` with roving `ArrowLeft`/`ArrowRight`/`Home`/`End` and pseudo-element `border-block-end` active indicator), auto-sizing `.asterisk-textarea` (`field-sizing: content` locked to `width: 100%`), custom ARIA `TopicPicker` (`role="listbox"`), native `<dialog closedby="any">` `NotesDrawer` with `overscroll-behavior: contain` and Safari coordinate light-dismiss fallback, and `<details>` disclosure for side-by-side matrices, reply-link education, and non-technical tap-by-tap setup guides.

---

### 4. Live Dogfooding Refinements (Pass 3 Polish)

Reviewing the live application highlighted three practical refinements captured before shipping:

1. **Pure Sans-Serif Eyebrows (`Inter` over `JetBrains Mono`):** Replacing monospace uppercase labels with crisp tracked `Inter` (while keeping `tabular-nums` on character counters) made headlines, UI tabs, and editorial notes feel coherent and less developer-jargony.
2. **Custom Warm-Paper `TopicPicker` over OS `<select>`:** Browser-default gray select menus and far-right carets broke the calm watercolor surface; a bespoke accessible `listbox` pill with a tight chevron aligns the selector with the sheet.
3. **Anti-Anxiety Collapsible `Rhythm` & Prescriptive Onboarding:** Moving `"Never posted"` badges out of a full-width top bar into an optional `Rhythm` header popover—and pairing non-technical tap-by-tap walkthroughs, `Why use a self-reply?` educational boxes, and **# Hash Journal** saving—turned `/studio` from an intimidating checklist into a welcoming creative desk.
