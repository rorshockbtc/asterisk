'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, m, useReducedMotion } from 'framer-motion';

/**
 * Print vs. watercolor: the art-direction idea, shown rather than told.
 * Hovering/focusing the watercolor side lets a wash bleed in behind it.
 */
export default function ArtNote() {
  const reduce = useReducedMotion();
  const [wet, setWet] = useState(false);

  return (
    <section aria-labelledby="art-note" className="relative bg-[var(--a-bg)] py-24 sm:py-32 border-t border-[var(--a-rule)]">
      <div className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12">
        <p className="font-sans text-[13px] font-semibold uppercase tracking-[0.16em] text-[var(--a-muted)]">Why it looks like this</p>
        <h2 id="art-note" className="sr-only">Print and watercolor</h2>

        <div className="mt-10 grid gap-12 md:grid-cols-2 md:gap-0">
          <div className="md:pr-12 md:border-r md:border-[var(--a-rule)] space-y-5">
            <p className="font-display text-huge font-bold text-[var(--a-ink)] tracking-[-0.05em]">Print.</p>
            <p className="max-w-[40ch] text-lg leading-relaxed text-[var(--a-ink)]/75">
              Our studio site is print: rigid, repeatable, engineered. Bold grotesque type set against Guy
              Billout&apos;s precise, surreal plates.
            </p>
          </div>

          <div
            tabIndex={0}
            onPointerEnter={() => setWet(true)}
            onPointerLeave={() => setWet(false)}
            onFocus={() => setWet(true)}
            onBlur={() => setWet(false)}
            className="relative md:pl-12 space-y-5 outline-offset-8"
          >
            <AnimatePresence>
              {(wet || reduce) && (
                <m.div
                  aria-hidden="true"
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                  className="pointer-events-none absolute -inset-8 -z-0"
                >
                  <div
                    className="absolute inset-0 blur-[2px]"
                    style={{
                      background:
                        'radial-gradient(45% 55% at 30% 35%, rgba(247,185,201,0.75), transparent 70%), radial-gradient(40% 50% at 70% 65%, rgba(169,211,234,0.7), transparent 72%), radial-gradient(35% 40% at 60% 25%, rgba(156,143,208,0.5), transparent 70%)',
                    }}
                  />
                </m.div>
              )}
            </AnimatePresence>
            <p className="relative font-serif italic text-huge text-[var(--a-ink)] tracking-[-0.03em]">Watercolor.</p>
            <p className="relative max-w-[40ch] text-lg leading-relaxed text-[var(--a-ink)]/80">
              asterisk is its companion: the same typographic spine, but the art bleeds, drifts, and answers your
              hand. If a font pairing balances a serif with a sans, this balances print with watercolor.
            </p>
            <Link href="/colophon" className="relative wc-link inline-flex min-h-[44px] items-center text-lg font-semibold text-[var(--a-ink)]">
              Read the colophon →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
