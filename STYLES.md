# STYLES.md — Accént 3.0 Brand Adapter Contract (`asterisk` · `playful-principal` + Folon Watercolor)

> **Style Control Plane (`STYLES.md` vs. `AGENTS.md`)**: Operational agent rules live in `AGENTS.md`. All visual, typographic, chromatic, structural, and motion rules for **asterisk (`*`)** live here, in [`ART_DIRECTION.md`](./ART_DIRECTION.md), and in [`src/app/globals.css`](./src/app/globals.css).
> Visual Dialect: `playful-principal` (aligned with `colonhyphenbracket.pink` & `accent-ui@1.0.0`) paired with a Folon-inspired watercolor art layer.

---

## 1. Visual & Chromatic Invariants

### UI Dialect (`playful-principal`)
- **Canvas (`--a-bg`)**: `#FAF8F5` (Alabaster paper)
- **Architectural Strip (`--a-surface`)**: `#F3EEE6`
- **Writing Sheet (`--a-well`)**: `#FFFFFF`
- **Primary Ink (`--a-ink`)**: `#111827` · **Muted (`--a-muted`)**: `#4B5563`
- **Hairline (`--a-rule`)**: `rgba(17, 24, 39, 0.12)`
- **Sovereign Hot Pink (`--a-accent` / `--a-accent-fill`)**: `#FE299E` (hover `#111827`, white text `#FFFFFF`, inline link `#B81468`)
- **Typography**: **Bricolage Grotesque** (display, `-0.035em`–`-0.04em`), **Newsreader** (italic voice, editorial numerals, generous seed prose), **Inter** (UI & reading prose), **JetBrains Mono** (eyebrows, `*.post`, char meters, specs).

### Art Layer ("after Folon")
- **Dawn Pink (`--wc-dawn`)**: `#F7B9C9` · **Pigment Core (`--wc-pigment`)**: `#FE299E`
- **Peach Haze (`--wc-peach`)**: `#FAD6B8` · **Folon Violet (`--wc-violet`)**: `#9C8FD0`
- **Sky Wash (`--wc-sky`)**: `#A9D3EA` · **Silhouette Ink (`--wc-ink`)**: `#2A2F45` (never pure black)
- **Compositing**: Layer plates (`layer-figure-*`, `layer-envelope-*`, `layer-bird`) use `mix-blend-mode: multiply` (`.wc-glaze`) over `#FAF8F5`.

---

## 2. Surface Archetypes & Motion Budgets

1. **Threshold (`/` marketing & `/colophon`)**:
   - Choreographed scroll storytelling allowed: living Three.js shader sky (`WatercolorSky`), rising `AsteriskSun`, pinned `*.post` wildcard reveal, horizontal `Panorama` travel, and `HowItWorks` weather crossfade.
2. **Sanctuary (`/studio` & `/studio/setup`)**:
   - **Zero scroll-jacking.** Motion responds *only* to user intent: focus watercolor wash, lifting bird tabs (`HorizonTabs`), weather crossfades (`WeatherBand`), perched setup birds, and winged envelope flight on send (`EnvelopeFlight`).
3. **Gallery (`/studio/rooms` & `/login`)**:
   - Full-bleed portrait paintings (`ROOM_ART`, `scene-door`) paired with editorial type and subtle hover/ambient light motion.
4. **Reduced Motion**:
   - Every shader, bird loop, scroll transform, and envelope flight collapses cleanly to a static final state when `prefers-reduced-motion: reduce` or Accént's `MotionToggle` is active.

---

## 3. Layer 1 Accessibility & Layout Invariants

- **Zero Nested Cards (`card.no-nesting`)**: Separate siblings with space, background contrast, or `1px` hairlines (`--a-rule`).
- **Single Primary CTA Per Section / Tab**: One `.wc-cta` pill per focal area; secondary actions use `.wc-link` brush underlines.
- **Strict `13px` (`0.8125rem`) Typographic Floor**: `--text-xs` overridden to `0.8125rem` in `@theme inline`.
- **`44×44px` Minimum Interactive Touch Targets**: Enforced across links, tabs, pills, inputs, and checkboxes.
- **Native Top-Layer `<dialog>`**: Saved notes drawer uses `<dialog closedby="any">` with `overscroll-behavior: contain` and Safari backdrop coordinate fallback.
