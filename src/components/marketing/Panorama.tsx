'use client';

import React, { useRef, useState } from 'react';
import {
  m,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'framer-motion';
import { ART } from '@/lib/art-direction';

/**
 * "Who it's for": one painted horizon, three people.
 * Desktop: the section pins; the camera drifts left -> right across the plate while a soft
 * pool of dawn light finds each figure in turn and its corresponding column illuminates
 * while inactive columns cleanly recede into the background.
 * Mobile: a calm stack (plate + three captions).
 */
const PEOPLE = [
  {
    who: 'Builders',
    line: 'shipping in public.',
    body: 'You post the screenshot, the fix, the launch. asterisk keeps the receipts crisp on X and the conversation going on Threads.',
  },
  {
    who: 'Writers',
    line: 'with something to say.',
    body: 'One idea becomes a Substack note, a Threads post, and a warm Facebook story, each in the shape that room expects.',
  },
  {
    who: 'Makers',
    line: 'who hate posting six times.',
    body: 'Write it once in your own words. The adapting, the link-shuffling, and the remembering are handled.',
  },
] as const;

export default function Panorama() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const [activeIdx, setActiveIdx] = useState<0 | 1 | 2>(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    const next: 0 | 1 | 2 = v < 0.34 ? 0 : v < 0.67 ? 1 : 2;
    setActiveIdx((prev) => (prev === next ? prev : next));
  });

  // Camera: drift across the plate across the full [0..1] range so WAAPI timelines never snap back.
  const plateX = useTransform(
    scrollYProgress,
    [0, 0.05, 0.95, 1],
    reduce ? ['0%', '0%', '0%', '0%'] : ['7%', '7%', '-7%', '-7%']
  );
  const plateScale = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    reduce ? [1.0, 1.0, 1.0] : [1.18, 1.12, 1.18]
  );
  // Light: a dawn-pink pool tracks the active figure cleanly across [0..1].
  const lightX = useTransform(
    scrollYProgress,
    [0, 0.12, 0.5, 0.88, 1],
    ['16%', '16%', '52%', '86%', '86%']
  );

  return (
    <section ref={ref} aria-labelledby="who-for" className="relative md:h-[290svh] bg-[var(--a-bg)]">
      <div className="md:sticky md:top-0 md:flex md:h-svh md:flex-col md:overflow-hidden">
        <div className="mx-auto w-full max-w-[1400px] px-5 sm:px-8 lg:px-12 pt-24 md:pt-28">
          <p className="font-sans text-[13px] font-semibold uppercase tracking-[0.16em] text-[var(--a-muted)]">
            Who it&apos;s for
          </p>
          <h2 id="who-for" className="mt-3 font-display text-big font-bold text-[var(--a-ink)]">
            Three people, <span className="font-serif italic font-normal">one horizon.</span>
          </h2>
        </div>

        {/* Plate */}
        <div className="relative mt-6 md:mt-8 w-full overflow-hidden aspect-[16/9] md:aspect-auto md:flex-1 md:min-h-0">
          <m.div style={{ x: plateX, scale: plateScale }} className="absolute inset-0 will-change-transform">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ART.panorama.src}
              srcSet={`${ART.panorama.srcSmall} 1600w, ${ART.panorama.src} 2400w`}
              sizes="100vw"
              alt={ART.panorama.alt}
              className="h-full w-full object-cover object-bottom"
            />
          </m.div>
          {!reduce && (
            <m.div
              aria-hidden="true"
              style={{ left: lightX }}
              className="pointer-events-none absolute bottom-[4%] hidden md:block h-[70%] w-[34%] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(255,125,186,0.32),rgba(250,214,184,0.18)_55%,transparent)] mix-blend-soft-light"
            />
          )}
          {/* Paper fade into the page */}
          <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[18%] bg-gradient-to-b from-transparent to-[var(--a-bg)]" />
        </div>

        {/* Captions */}
        <div className="mx-auto w-full max-w-[1400px] px-5 sm:px-8 lg:px-12 pb-10 md:pb-12">
          <div className="md:hidden space-y-10 pt-6">
            {PEOPLE.map((p) => (
              <div key={p.who} className="border-t border-[var(--a-rule)] pt-4">
                <PersonCopy {...p} lit={true} />
              </div>
            ))}
          </div>

          <div className="hidden md:grid md:grid-cols-3 md:gap-8 lg:gap-12 pt-4">
            {PEOPLE.map((p, idx) => {
              const lit = Boolean(reduce) || activeIdx === idx;
              return (
                <div
                  key={p.who}
                  data-panorama-col={idx}
                  data-lit={lit ? 'true' : 'false'}
                  style={{ opacity: lit ? 1 : 0.25 }}
                  className={`space-y-4 transition-[opacity,transform,color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    lit ? 'translate-y-0' : 'translate-y-1.5'
                  }`}
                >
                  <div
                    aria-hidden="true"
                    className={`h-0.5 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                      lit
                        ? 'w-10 bg-[var(--a-accent)] opacity-100'
                        : 'w-6 bg-[var(--a-rule)] opacity-50'
                    }`}
                  />
                  <PersonCopy who={p.who} line={p.line} body={p.body} lit={lit} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function PersonCopy({
  who,
  line,
  body,
  lit,
}: {
  who: string;
  line: string;
  body: string;
  lit: boolean;
}) {
  return (
    <div className="space-y-2.5">
      <h3
        className={`font-display text-2xl lg:text-3xl tracking-[-0.03em] transition-colors duration-500 ${
          lit ? 'font-bold text-[var(--a-ink)]' : 'font-medium text-[var(--a-muted)]'
        }`}
      >
        {who}{' '}
        <span
          className={`font-serif italic font-normal transition-colors duration-500 ${
            lit ? 'text-[var(--a-ink)]/80' : 'text-[var(--a-muted)]/75'
          }`}
        >
          {line}
        </span>
      </h3>
      <p
        className={`max-w-[38ch] text-base lg:text-lg leading-relaxed transition-colors duration-500 ${
          lit ? 'text-[var(--a-ink)]/80' : 'text-[var(--a-muted)]/75'
        }`}
      >
        {body}
      </p>
    </div>
  );
}
