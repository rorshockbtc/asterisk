'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { Eyebrow, FadeUp } from 'accent-ui';
import SiteHeader from '@/components/site/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';
import WetBrushCanvas from '@/art/WetBrushCanvas';
import { bloomHandlers } from '@/art/bloom';
import { ART } from '@/lib/art-direction';

const MOTIFS = [
  { motif: 'Small hatted figure', role: 'You, the writer — facing a quiet horizon without facial noise.' },
  { motif: 'The asterisk sun (*)', role: 'One core thought; its six pink rays are the six rooms it feeds.' },
  { motif: 'Winged envelopes', role: 'Posts in flight — two-frame wash wings lifting off at send time.' },
  { motif: 'Six birds', role: 'The channels perched on a horizon line; the active bird lifts into flight.' },
  { motif: 'Open window', role: 'Open source: light spills through so you can inspect every line.' },
  { motif: 'Open door', role: 'The threshold into a private Pipes studio room.' },
  { motif: 'Changing sky', role: 'Pre-Flight readiness rendered as weather (overcast → clearing → blue).' },
];

const SHORTLIST: { artist: string; origin: string; verdict: string; note: string }[] = [
  {
    artist: 'Jean-Michel Folon',
    origin: 'Belgium',
    verdict: 'Chosen',
    note: 'Whimsy, surrealism, color, and motion. Watercolor is fluid where Guy Billout’s printmaking on colonhyphenbracket.pink is engineered—pairing the two sites like serif and sans-serif.',
  },
  {
    artist: 'Ikko Tanaka',
    origin: 'Japan',
    verdict: '2nd',
    note: 'A very strong contender, but rigid woodblock geometry would compete with the organic, flowing nature of the writing tool.',
  },
  {
    artist: 'Antonio Frasconi',
    origin: 'Uruguay / US',
    verdict: '3rd',
    note: 'Deeply expressive prints, yet typically too dark in tone and too ornate to animate smoothly without heavy visual strain.',
  },
  {
    artist: 'Saul Bass',
    origin: 'United States',
    verdict: 'Reserved',
    note: 'A strong contender reserved for a future standalone site built around his cut-paper print style.',
  },
  {
    artist: 'Josef Albers',
    origin: 'Germany / US',
    verdict: 'Set aside',
    note: 'Already underpins the Accént design system and related studio properties; too abstract for a mainstream writing tool.',
  },
  {
    artist: 'Anni Albers',
    origin: 'Germany / US',
    verdict: 'Set aside',
    note: 'Textiles translate unevenly to glass screens and ask visitors for mid-century theory before relating.',
  },
  {
    artist: 'Giorgio Morandi',
    origin: 'Italy',
    verdict: 'Set aside',
    note: 'Too painterly for asterisk; a stronger fit for quiet long-form Pipes editions.',
  },
  {
    artist: 'Saul Steinberg',
    origin: 'Romania / US',
    verdict: 'Set aside',
    note: 'Iconic single-line ink, but instantly reads as “The New Yorker” rather than something fresh yet relatable.',
  },
  {
    artist: 'Bruno Munari',
    origin: 'Italy',
    verdict: 'Set aside',
    note: 'Small collage masks compete with typography-led product names; more static statement than motion and calm.',
  },
  {
    artist: 'Piero Fornasetti',
    origin: 'Italy',
    verdict: 'Set aside',
    note: 'Human faces pull visual focus away from the writer’s own draft.',
  },
  {
    artist: 'Paul Cox',
    origin: 'France',
    verdict: 'Set aside',
    note: 'Too painterly for a utility-forward interface.',
  },
  {
    artist: 'Tadanori Yokoo',
    origin: 'Japan',
    verdict: 'Set aside',
    note: 'Bold and kinetic, yet too chaotic to sit peacefully beside daily workflows.',
  },
  {
    artist: 'Ben Shahn',
    origin: 'Lithuania / US',
    verdict: 'Set aside',
    note: 'Too painterly and human-figurative; faces compete with animated motion.',
  },
  {
    artist: 'Charley Harper',
    origin: 'United States',
    verdict: 'Set aside',
    note: 'Too familiar and literal for an American audience.',
  },
];

export default function ColophonView() {
  const heroRef = useRef<HTMLElement>(null);

  return (
    <>
      <SiteHeader />

      <main className="bg-[var(--a-bg)] text-[var(--a-ink)]">
        {/* Hero Essay Masthead with interactive wet-on-wet watercolor brushstroke canvas */}
        <section
          ref={heroRef}
          className="relative overflow-hidden border-b border-[var(--a-rule)] touch-pan-y"
        >
          <WetBrushCanvas containerRef={heroRef} />

          <div className="relative z-10 mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 pt-28 sm:pt-36 pb-16 sm:pb-24">
            <FadeUp immediate className="max-w-[56rem] space-y-6">
              <Eyebrow mark="*" color="var(--a-accent)">
                Colophon &amp; Art Direction
              </Eyebrow>
              <h1 className="font-display text-huge font-bold text-[var(--a-ink)]">
                Print is the sans-serif.{' '}
                <span className="font-serif italic font-normal">Watercolor is the serif.</span>
              </h1>
              <p className="max-w-[52ch] text-lg sm:text-xl leading-relaxed text-[var(--a-ink)]/85">
                Colon Hyphen Bracket&apos;s flagship site is built like printmaking: engineered, crisp,
                bold grotesque type beside Guy Billout&apos;s precise plates. asterisk is its
                watercolor companion—sharing the typographic spine while letting the art bleed, drift,
                and respond to your hand.
              </p>
              <p className="font-serif italic text-[15px] text-[var(--a-muted)] pt-1">
                <span className="not-italic text-[var(--a-accent)] mr-1.5">*</span>
                Move your cursor—or sweep your thumb—across this sheet to paint wet-on-wet washes before they disperse into the paper.
              </p>
            </FadeUp>
          </div>
        </section>

        {/* Section 1: Hero Plate & Why Folon */}
        <section className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 py-20 sm:py-28 border-b border-[var(--a-rule)]">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-16">
            <figure className="lg:col-span-7 space-y-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ART.heroPlate.src}
                srcSet={`${ART.heroPlate.srcSmall} 1200w, ${ART.heroPlate.src} 2400w`}
                sizes="(max-width: 1024px) 94vw, 56vw"
                alt={ART.heroPlate.alt}
                className="block w-full aspect-video object-cover"
              />
              <figcaption className="font-serif italic text-base text-[var(--a-muted)]">
                Original watercolor horizon “after Folon” — soft violet-to-pink wash, low horizon,
                and generous negative space for headline typography.
              </figcaption>
            </figure>

            <div className="lg:col-span-5 space-y-6">
              <p className="font-sans text-[13px] font-semibold uppercase tracking-[0.16em] text-[var(--a-muted)]">
                01 · Why Jean-Michel Folon
              </p>
              <h2 className="font-display text-big font-bold text-[var(--a-ink)]">
                Messages in flight.
              </h2>
              <p className="text-lg leading-relaxed text-[var(--a-ink)]/80">
                Folon spent decades painting winged envelopes, birds, arrows, and solitary hatted
                figures facing vast dawn skies. For software whose entire job is sending one honest
                thought out into six different rooms, the metaphor needs zero explanation.
              </p>
              <p className="border-l-2 border-[var(--a-accent)] pl-4 text-[15px] leading-relaxed text-[var(--a-muted)]">
                Every plate on this site is an <strong>original composition</strong> created in that
                spirit—never copied, traced, or reconstructed from existing Folon works, and without
                reproduced signatures.
              </p>
            </div>
          </div>

          {/* Motif Glossary */}
          <div className="mt-20 border-t border-[var(--a-rule)] pt-12">
            <p className="font-sans text-[13px] font-semibold uppercase tracking-[0.16em] text-[var(--a-muted)]">
              Motif Glossary
            </p>
            <dl className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
              {MOTIFS.map((m) => (
                <div key={m.motif} className="space-y-1.5 border-t border-[var(--a-rule)] pt-4">
                  <dt className="font-display text-lg font-bold text-[var(--a-ink)]">{m.motif}</dt>
                  <dd className="text-[15px] leading-relaxed text-[var(--a-muted)]">{m.role}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Section 2: 14-Artist Curatorial Shortlist */}
        <section className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 py-20 sm:py-28 border-b border-[var(--a-rule)]">
          <div className="max-w-[48rem] space-y-4 mb-12">
            <p className="font-sans text-[13px] font-semibold uppercase tracking-[0.16em] text-[var(--a-muted)]">
              02 · The Shortlist
            </p>
            <h2 className="font-display text-big font-bold text-[var(--a-ink)]">
              Fourteen artists considered,{' '}
              <span className="font-serif italic font-normal">one chosen.</span>
            </h2>
            <p className="text-lg leading-relaxed text-[var(--a-ink)]/75">
              Good art direction is mostly knowing what to say no to. Here is the complete list we
              weighed before settling on watercolor.
            </p>
          </div>

          <ol className="divide-y divide-[var(--a-rule)] border-y border-[var(--a-rule)]">
            {SHORTLIST.map((entry, idx) => {
              const isChosen = entry.verdict === 'Chosen';
              return (
                <li
                  key={entry.artist}
                  className="py-6 grid gap-3 sm:grid-cols-[56px_240px_110px_1fr] sm:items-baseline"
                >
                  <span className="font-serif text-xl text-[var(--a-muted)] tabular-nums">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <span className="font-display text-lg font-bold text-[var(--a-ink)]">
                      {entry.artist}
                    </span>
                    <span className="block font-sans text-[13px] text-[var(--a-muted)]">
                      {entry.origin}
                    </span>
                  </div>
                  <span
                    className={`font-sans text-[13px] uppercase tracking-[0.14em] ${
                      isChosen
                        ? 'font-semibold text-[var(--a-accent-text)]'
                        : 'font-medium text-[var(--a-muted)]'
                    }`}
                  >
                    {entry.verdict}
                  </span>
                  <p className="text-[16px] leading-relaxed text-[var(--a-ink)]/80">{entry.note}</p>
                </li>
              );
            })}
          </ol>
        </section>

        {/* Section 3: How the Living Watercolor Works */}
        <section className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 py-20 sm:py-28">
          <div className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-5 space-y-4">
              <p className="font-sans text-[13px] font-semibold uppercase tracking-[0.16em] text-[var(--a-muted)]">
                03 · Craft &amp; Motion
              </p>
              <h2 className="font-display text-big font-bold text-[var(--a-ink)]">
                Pigment, not stickers.
              </h2>
            </div>

            <div className="lg:col-span-7 space-y-8 text-lg leading-relaxed text-[var(--a-ink)]/80">
              <p>
                Instead of gluing flat images into rounded cards, every sky, figure, bird, and
                envelope is painted on cold-press white paper, leveled to pure white in a{' '}
                <code className="font-semibold text-[15px]">sharp</code> pipeline, and layered with{' '}
                <code className="font-semibold text-[15px]">mix-blend-mode: multiply</code>—just like
                translucent watercolor glazes.
              </p>
              <p>
                Behind the hero, a Three.js shader computes domain-warped fbm noise so dawn washes
                bleed slowly and bend away from your pointer, pausing automatically offscreen and
                collapsing to a single painted frame whenever reduced motion is requested.
              </p>

              <div className="pt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
                <Link
                  href="/"
                  {...bloomHandlers<HTMLAnchorElement>()}
                  className="wc-cta inline-flex min-h-[52px] items-center gap-2 rounded-full bg-[var(--a-accent-fill)] px-7 text-base font-semibold text-white no-underline shadow-[0_14px_36px_-14px_rgba(254,41,158,0.7)]"
                >
                  See it in motion →
                </Link>
                <Link
                  href="/login"
                  className="wc-link min-h-[44px] inline-flex items-center text-base font-semibold text-[var(--a-ink)]"
                >
                  Open asterisk
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
