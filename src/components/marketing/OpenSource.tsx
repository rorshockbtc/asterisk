'use client';

import React from 'react';
import { m, useReducedMotion } from 'framer-motion';
import { ART } from '@/lib/art-direction';
import { GITHUB_REPO_URL } from '@/lib/session';

const FACTS = [
  { k: 'Apache 2.0', v: 'Open-source code with clear trademark and patent protection.' },
  { k: 'Local-first', v: 'Drafts live with you, never sold into an ad graph.' },
  { k: 'Zero tracking', v: 'No pixels, no shadow profiles, no analytics telemetry.' },
];

export default function OpenSource() {
  const reduce = useReducedMotion();
  return (
    <section id="open" aria-labelledby="open-title" className="relative scroll-mt-20 bg-[var(--a-bg)] py-24 sm:py-36">
      <div className="mx-auto grid max-w-[1400px] gap-14 px-5 sm:px-8 lg:px-12 lg:grid-cols-12 lg:items-center">
        <m.figure
          initial={reduce ? false : { clipPath: 'circle(8% at 50% 46%)', opacity: 0.4 }}
          whileInView={{ clipPath: 'circle(75% at 50% 46%)', opacity: 1 }}
          viewport={{ once: true, margin: '-15% 0px' }}
          transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
          className="lg:col-span-5"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ART.window.src} alt={ART.window.alt} loading="lazy" className="w-full aspect-[3/4] object-cover" />
        </m.figure>

        <div className="lg:col-span-7 space-y-8">
          <p className="font-sans text-[13px] font-semibold uppercase tracking-[0.16em] text-[var(--a-muted)]">Open source</p>
          <h2 id="open-title" className="font-display text-big font-bold text-[var(--a-ink)]">
            Read every line. <span className="font-serif italic font-normal">Keep every draft.</span>
          </h2>
          <p className="max-w-[52ch] text-lg sm:text-xl leading-relaxed text-[var(--a-ink)]/80">
            Open source means the window is open: you can inspect how asterisk formats posts, checks room rules,
            and stores your notes—or fork and host your own instance cleanly under Apache-2.0.
          </p>

          <dl className="grid gap-6 border-t border-[var(--a-rule)] pt-8 sm:grid-cols-3">
            {FACTS.map((f) => (
              <div key={f.k} className="space-y-1.5">
                <dt className="font-display text-2xl font-bold tracking-[-0.02em] text-[var(--a-ink)]">{f.k}</dt>
                <dd className="text-[15px] leading-relaxed text-[var(--a-muted)]">{f.v}</dd>
              </div>
            ))}
          </dl>

          <div className="border-l-2 border-[var(--a-accent)] pl-5 py-1 space-y-2">
            <p className="font-code text-[14px] sm:text-[15px] font-medium text-[var(--a-ink)] break-all">
              <span className="text-[var(--a-muted)]">$</span> git clone {GITHUB_REPO_URL}.git &amp;&amp; npm run dev
            </p>
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="wc-link inline-flex min-h-[38px] items-center text-[15px] font-semibold text-[var(--a-ink)]"
            >
              Browse rorshockbtc/asterisk on GitHub ↗
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
