'use client';

import React from 'react';
import Link from 'next/link';
import { Smile } from 'accent-ui';
import { GITHUB_REPO_URL, PIPES_SIGNUP_URL } from '@/lib/session';

/**
 * Studio lane + footer. Kept visually and semantically separate from product CTAs:
 * asterisk the product lives on Pipes; the craft behind it is a Colon Hyphen Bracket studio piece.
 */
export default function SiteFooter() {
  return (
    <footer>
      <section
        aria-labelledby="studio-band"
        className="bg-[var(--a-ink)] text-[var(--a-bg)]"
      >
        <div className="mx-auto grid max-w-[1400px] gap-10 px-5 sm:px-8 lg:px-12 py-20 sm:py-28 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7 space-y-6">
            <p className="font-sans text-[13px] font-semibold uppercase tracking-[0.16em] text-[var(--a-bg)]/60">
              A studio piece
            </p>
            <h2 id="studio-band" className="font-display text-big font-bold text-[var(--a-bg)]">
              Designed &amp; built by Colon&nbsp;Hyphen&nbsp;Bracket.
            </h2>
            <p className="max-w-[52ch] text-lg sm:text-xl leading-relaxed text-[var(--a-bg)]/75">
              asterisk is a working tool and a sketch of how we work: one principal, a real design system, and
              art direction that earns its place. If you want your product to feel like this, let&apos;s talk.
            </p>
          </div>
          <div className="lg:col-span-5 flex flex-col items-start lg:items-end justify-between gap-8">
            <div aria-hidden="true" className="select-none">
              <Smile
                color="#FE299E"
                winkEvery={4500}
                className="font-display text-[72px] sm:text-[108px] font-bold leading-none tracking-[-0.04em]"
              />
            </div>
            <a
              href="https://colonhyphenbracket.pink/contact"
              className="inline-flex min-h-[48px] items-center gap-3 rounded-full border-2 border-[var(--a-bg)] px-6 text-lg font-semibold text-[var(--a-bg)] no-underline transition-colors hover:bg-[var(--a-bg)] hover:text-[var(--a-ink)]"
            >
              Work with the studio <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>
      </section>

      <div className="border-t border-[var(--a-rule)] bg-[var(--a-bg)]">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4 px-5 sm:px-8 lg:px-12 py-6 text-[13px] text-[var(--a-muted)]">
          <div className="flex items-center gap-2.5">
            <span aria-hidden="true" className="font-display text-base font-bold text-[var(--a-accent)]">
              *
            </span>
            <span>asterisk · Apache-2.0 code · Art © Colon Hyphen Bracket</span>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap items-center gap-5">
            <Link href="/colophon" className="wc-link">Colophon</Link>
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="wc-link"
            >
              GitHub
            </a>
            <a
              href={PIPES_SIGNUP_URL}
              target="_blank"
              rel="noopener"
              className="wc-link"
            >
              Pipes
            </a>
            <a href="https://colonhyphenbracket.pink" className="wc-link">colonhyphenbracket.pink</a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
