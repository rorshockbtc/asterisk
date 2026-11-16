'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { m, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import DriftingBirds from '@/art/DriftingBirds';
import WatercolorSky, { TWILIGHT_PALETTE } from '@/art/WatercolorSky';
import WingedEnvelope from '@/art/WingedEnvelope';
import { bloomHandlers } from '@/art/bloom';
import { ART } from '@/lib/art-direction';
import { useSessionStatus } from '@/lib/use-session-status';

export default function Closing() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { authenticated, pipesSignedIn } = useSessionStatus();
  const isLoggedIn = authenticated || pipesSignedIn;
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const skyProgress = useTransform(scrollYProgress, [0, 1], [0.15, 0.95]);

  return (
    <section ref={ref} aria-labelledby="closing-title" className="relative overflow-hidden bg-[#241E45]">
      <WatercolorSky
        progress={skyProgress}
        palette={TWILIGHT_PALETTE}
        fallbackSrc={ART.skyBold.src}
      />
      <DriftingBirds />

      {!reduce && (
        <m.div
          aria-hidden="true"
          initial={{ opacity: 0, x: '-8%', y: 24, scale: 0.65, rotate: -6 }}
          animate={{
            opacity: [0, 0.92, 0.88, 0],
            x: '108%',
            y: -96,
            scale: 0.95,
            rotate: 5,
          }}
          transition={{
            x: { duration: 16, repeat: Infinity, repeatDelay: 2.5, ease: 'linear' },
            y: { duration: 16, repeat: Infinity, repeatDelay: 2.5, ease: 'easeOut' },
            scale: { duration: 16, repeat: Infinity, repeatDelay: 2.5, ease: 'easeOut' },
            rotate: { duration: 16, repeat: Infinity, repeatDelay: 2.5, ease: 'easeOut' },
            opacity: { duration: 16, repeat: Infinity, repeatDelay: 2.5, times: [0, 0.12, 0.86, 1], ease: 'linear' },
          }}
          className="pointer-events-none absolute left-[4%] bottom-[24%] w-16 sm:w-24"
        >
          <WingedEnvelope className="w-full aspect-square" flapMs={420} />
        </m.div>
      )}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(65%_70%_at_18%_45%,rgba(28,22,58,0.52)_0%,transparent_72%)]"
      />

      <div className="relative z-10 mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 pt-28 pb-36 sm:pt-40 sm:pb-48">
        <h2
          id="closing-title"
          className="max-w-[14ch] font-display text-huge font-bold text-[var(--a-bg)] drop-shadow-[0_2px_28px_rgba(24,18,52,0.42)]"
        >
          One thought. <span className="font-serif italic font-normal">Every room.</span>
        </h2>
        <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
          <Link
            href={isLoggedIn ? '/app' : '/login?intent=signup'}
            {...bloomHandlers<HTMLAnchorElement>()}
            className="wc-cta inline-flex min-h-[52px] items-center gap-2 rounded-full bg-[var(--a-bg)] px-7 text-lg font-semibold text-[var(--a-ink)] no-underline hover:text-white"
          >
            {isLoggedIn ? 'Go to App →' : 'Sign up'}
          </Link>
          <a
            href="#demo"
            className="wc-link min-h-[44px] inline-flex items-center text-lg font-semibold text-[var(--a-bg)]"
          >
            Or try the demo first
          </a>
        </div>
      </div>
    </section>
  );
}
