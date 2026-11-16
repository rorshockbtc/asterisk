'use client';

import React, { useRef } from 'react';
import { m, useReducedMotion, useScroll, useTransform, type MotionValue } from 'framer-motion';
import { PLATFORM_ORDER } from '@/lib/platforms';
import { ART } from '@/lib/art-direction';

/** File names the `*` glob expands into, one per channel. */
export const GLOB_MATCHES = PLATFORM_ORDER.map((p) => `${p}.post`);

export default function AsteriskExplainer() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const starRotate = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [-30, 150]);
  const starScale = useTransform(scrollYProgress, [0, 0.5, 1], reduce ? [1, 1, 1] : [0.85, 1.05, 0.95]);

  return (
    <section ref={ref} aria-labelledby="what-is-asterisk" className="relative h-[240svh] bg-[var(--a-bg)]">
      <div className="sticky top-0 flex min-h-svh items-center overflow-hidden">
        <div className="mx-auto grid w-full max-w-[1400px] gap-10 px-5 sm:px-8 lg:px-12 py-24 lg:grid-cols-12 lg:items-center">
          <div className="relative lg:col-span-5 flex justify-center lg:justify-start">
            <m.span
              aria-hidden="true"
              style={{ rotate: starRotate, scale: starScale }}
              className="block select-none font-display font-bold leading-none text-[var(--a-accent)] text-[clamp(10rem,26vw,22rem)]"
            >
              *
            </m.span>
          </div>

          <div className="lg:col-span-7 space-y-8">
            <p className="font-sans text-[13px] font-semibold uppercase tracking-[0.16em] text-[var(--a-muted)]">What&apos;s in a name</p>
            <h2 id="what-is-asterisk" className="font-display text-big font-bold text-[var(--a-ink)]">
              In code, <span className="font-display text-[var(--a-accent)]">*</span> means{' '}
              <span className="font-serif italic font-normal">everything that matches.</span>
            </h2>

            <div
              className="font-code text-base sm:text-lg font-medium text-[var(--a-ink)] border-l-2 border-[var(--a-accent)] pl-5 space-y-1.5"
              aria-label={`The command ls star dot post lists: ${GLOB_MATCHES.join(', ')}`}
            >
              <p aria-hidden="true">
                <span className="text-[var(--a-muted)]">$</span> ls <span className="text-[var(--a-accent)]">*</span>.post
              </p>
              <ul aria-hidden="true" className="space-y-1">
                {GLOB_MATCHES.map((name, i) => (
                  <GlobLine key={name} name={name} index={i} progress={scrollYProgress} reduce={Boolean(reduce)} />
                ))}
              </ul>
            </div>

            <p className="max-w-[50ch] text-lg leading-relaxed text-[var(--a-ink)]/80">
              That&apos;s the whole idea. You write one thought, and asterisk finds every room it belongs in. In
              prose an asterisk is a footnote, a promise that there&apos;s more to say. In C it&apos;s a pointer to
              where the real thing lives. Wildcard, footnote, pointer: all three fit.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function GlobLine({
  name,
  index,
  progress,
  reduce,
}: {
  name: string;
  index: number;
  progress: MotionValue<number>;
  reduce: boolean;
}) {
  const start = 0.18 + index * 0.08;
  const opacity = useTransform(progress, [0, start, start + 0.06, 1], reduce ? [1, 1, 1, 1] : [0, 0, 1, 1]);
  const x = useTransform(progress, [0, start, start + 0.08, 1], reduce ? [0, 0, 0, 0] : [-12, -12, 0, 0]);
  const birdX = useTransform(progress, [0, start + 0.04, start + 0.3, 1], reduce ? [0, 0, 0, 0] : [0, 0, 220, 220]);
  const birdY = useTransform(progress, [0, start + 0.04, start + 0.3, 1], reduce ? [0, 0, 0, 0] : [0, 0, -90, -90]);
  const birdOpacity = useTransform(progress, [0, start + 0.02, start + 0.08, start + 0.26, start + 0.3, 1], [0, 0, 1, 1, 0, 0]);

  return (
    <m.li style={{ opacity, x }} className="relative flex items-center gap-3">
      <span>{name}</span>
      {!reduce && (
        <m.img
          src={ART.bird.src}
          alt=""
          draggable={false}
          style={{ x: birdX, y: birdY, opacity: birdOpacity }}
          className="wc-glaze pointer-events-none absolute left-[9.5em] h-8 w-8"
        />
      )}
    </m.li>
  );
}
