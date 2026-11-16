'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import WatercolorDripCanvas from '@/art/WatercolorDripCanvas';
import { bloomHandlers } from '@/art/bloom';
import { useSessionStatus } from '@/lib/use-session-status';

export default function Closing() {
  const ref = useRef<HTMLElement>(null);
  const { authenticated, pipesSignedIn } = useSessionStatus();
  const isLoggedIn = authenticated || pipesSignedIn;

  return (
    <section
      ref={ref}
      aria-labelledby="closing-title"
      className="relative overflow-hidden touch-pan-y"
      style={{
        background:
          'linear-gradient(180deg, #1D4E89 0%, #2E86DE 30%, #E8436E 58%, #FF6B6B 72%, #F79F1F 88%, #FFC312 100%)',
      }}
    >
      {/* Subtle watercolor horizon wash + organic cold-press clouds */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(68% 55% at 78% 24%, rgba(46, 134, 222, 0.35), transparent 70%), radial-gradient(62% 52% at 24% 62%, rgba(232, 67, 110, 0.28), transparent 72%), radial-gradient(75% 42% at 62% 94%, rgba(255, 195, 18, 0.35), transparent 75%)',
        }}
      />

      <WatercolorDripCanvas containerRef={ref} />

      {/* Gentle left-side reading vignette so white headline stays sharp over bright blooms */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(62%_75%_at_18%_48%,rgba(19,22,36,0.42)_0%,transparent_72%)]"
      />

      <div className="relative z-10 mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 pt-28 pb-36 sm:pt-40 sm:pb-48">
        <h2
          id="closing-title"
          className="max-w-[14ch] font-display text-huge font-bold text-white drop-shadow-[0_2px_28px_rgba(19,22,36,0.48)]"
        >
          One thought. <span className="font-serif italic font-normal">Every room.</span>
        </h2>
        <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
          <Link
            href={isLoggedIn ? '/app' : '/login?intent=signup'}
            {...bloomHandlers<HTMLAnchorElement>()}
            className="wc-cta inline-flex min-h-[52px] items-center gap-2 rounded-full bg-white px-7 text-lg font-semibold text-[var(--a-ink)] no-underline hover:text-white shadow-[0_14px_36px_-14px_rgba(19,22,36,0.45)]"
          >
            {isLoggedIn ? 'Go to App →' : 'Sign up'}
          </Link>
          <a
            href="#demo"
            className="wc-link min-h-[44px] inline-flex items-center text-lg font-semibold text-white drop-shadow-[0_1px_10px_rgba(19,22,36,0.45)]"
          >
            Or try the demo first
          </a>
        </div>
        <p className="mt-8 font-serif italic text-[15px] text-white/85 drop-shadow-[0_1px_8px_rgba(19,22,36,0.5)]">
          <span className="not-italic mr-1.5">*</span>
          Flick your cursor or tap to drop water and pigment—watch it bloom, mix, and drip down the horizon.
        </p>
      </div>
    </section>
  );
}
