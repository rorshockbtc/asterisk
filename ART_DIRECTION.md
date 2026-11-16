# ART_DIRECTION.md: asterisk (`*`)

> **Thesis.** The Colon Hyphen Bracket corporate site is *print*: rigid, repeatable, bold grotesque type set against Guy Billout's precise, surreal plates. asterisk is its *watercolor* companion. It keeps the same typographic spine (Bricolage Grotesque, Inter, Newsreader, JetBrains Mono) and lets the art do the opposite: fluid, bleeding, alive under the reader's hand.
>
> If a font pairing is a serif balancing a sans-serif, this is the same idea applied to art direction. Print is the sans; watercolor is the serif.

---

## 1. Why Jean-Michel Folon

Folon spent his career drawing **messages in flight**: winged envelopes, birds, arrows, and small hatted figures facing enormous, quiet horizons. asterisk is a tool for sending one thought out to many places, so the metaphor needs no translation.

What made him the right choice:

- **Whimsy without noise.** Surreal and playful, yet calm enough to sit behind real work.
- **Color that carries the brand.** His dawn gradients (violet → peach → pink) hold CHB's Sovereign Pink as a natural "dawn pink" rather than a sticker.
- **A medium that moves.** Watercolor is literally pigment in motion, which makes animation part of the art rather than a decoration on top of it.
- **A companion to Billout.** Billout is engineered, printed precision; watercolor is its opposite in nearly every way. Together the two sites read as one studio with range.
- **A real challenge.** Watercolor is rarely done well on the web. Doing it well is the point.

> [!IMPORTANT]
> All artwork is **original and made "after Folon."** No Folon work is copied, traced, or recomposed, and no signature or composition is reproduced. He is credited as an influence, never as the author.

---

## 2. The Shortlist (and why each was set aside)

| Artist | Origin | Verdict |
|---|---|---|
| **Jean-Michel Folon** | Belgium | **Chosen.** Whimsy, surrealism, color, and motion. The natural companion to Billout's rigid printmaking. |
| Ikko Tanaka | Japan | **2nd.** A very strong contender, but the rigid woodblock geometry would fight the organic, flowing nature of the site. |
| Antonio Frasconi | Uruguay / United States | **3rd.** Beautiful prints, but usually too dark in color and tone, and too ornate to animate without heavy cost. |
| Saul Bass | United States | Strong contender, **reserved for a future site** built around his print language. |
| Josef Albers | Germany / United States | Already underpins the design system and other assets; too abstract and "design-y" for a mainstream audience here. |
| Anni Albers | Germany / United States | Textiles translate poorly to screens; the rest of the work asks for mid-century theory to relate to it. |
| Giorgio Morandi | Italy | Too painterly for this site; a better fit for certain Pipes. |
| Saul Steinberg | Romania / United States | Wonderful single-line drawing, but it would read instantly as "New Yorker." I wanted something less familiar yet still relatable. |
| Bruno Munari | Italy | Many small images and masks would compete with typography-led product names; more static statement than motion and calm. |
| Piero Fornasetti | Italy | Human faces pull too much attention. |
| Paul Cox | France | Too painterly. |
| Tadanori Yokoo | Japan | Too chaotic and bold; it would compete with the app's workflows. |
| Ben Shahn | Lithuania / United States | Too painterly and too human; faces would compete with the animation. |
| Charley Harper | United States | Too familiar, too on-the-nose for an American audience. |

---

## 3. Palette (art layer)

UI tokens stay on Accént's `playful-principal` dialect. The art layer adds:

| Wash | Hex | Role |
|---|---|---|
| Dawn Pink | `#F7B9C9`, pigment core `#FE299E` | Sunrise, the asterisk sun, the bridge to brand pink |
| Peach Haze | `#FAD6B8` | Horizon glow |
| Folon Violet | `#9C8FD0` | Upper sky, dusk |
| Sky Wash | `#A9D3EA` | Clear sky, meaning "ready to ship" |
| Ink | `#2A2F45` | Figures, birds, envelopes (never pure black) |
| Paper | `#FAF8F5` | Canvas, matching the corporate site's Alabaster |

---

## 4. Motif Glossary

| Motif | Meaning in the product |
|---|---|
| Small hatted figure facing a horizon | You, the writer |
| The asterisk sun | One idea; its six rays are six channels |
| Winged envelopes | Posts in flight (the publish moment) |
| Birds | The six channels, or Rooms |
| Open window | Open source: you can see inside |
| Open door | The way in (login via Pipes) |
| Weather, from grey wash to clear sky | Pre-Flight readiness |

---

## 5. How the Watercolor Is Built

1. **Painted layers on white paper.** Sky, figure, birds, and envelopes are painted as separate plates on white paper and composited in the browser with `mix-blend-mode: multiply`. Like real glazing, each layer darkens only where pigment sits, so layers can move independently and still read as one painting.
2. **A living sky (Three.js).** The marketing hero renders the sky as a single shader plane: layered noise drives soft wet-in-wet bleeding between violet, peach, and pink. It drifts slowly and responds to the pointer and to scroll. It's lazy-loaded, paused offscreen, and falls back to a painted plate when WebGL or motion is unavailable.
3. **Wet edges in SVG.** Small motifs use one shared, static displacement filter for irregular edges. Motion comes from `transform`, `opacity`, and masks only, never from re-computing the filter.
4. **Pigment bloom.** Hover and keyboard focus grow a soft watercolor blot from the point of interaction, so the page answers your hand the way wet paper does.

---

## 6. Motion Budget

- **Marketing page:** choreographed scroll storytelling (rising sun, pinned scenes, a horizontal horizon you travel along).
- **Studio, Rooms, Setup:** motion only in response to what you do: hover, focus, typing, and publishing. No scroll-jacking where people work.
- **Always:** reduced-motion preferences collapse every scene to its final, still painting.
