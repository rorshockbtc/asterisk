'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  m,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion';
import { RiseLines } from 'accent-ui';
import DriftingBirds from '@/art/DriftingBirds';
import WatercolorSky from '@/art/WatercolorSky';
import WingedEnvelope from '@/art/WingedEnvelope';
import { bloomHandlers } from '@/art/bloom';
import { ART } from '@/lib/art-direction';

const ENVELOPES = [
  { start: 0.34, x: [0, 34], y: [0, -46], scale: [0.5, 0.82], rot: [-8, 6], size: 'w-16 sm:w-20' },
  { start: 0.44, x: [0, 24], y: [0, -58], scale: [0.45, 0.7], rot: [6, -4], size: 'w-12 sm:w-16' },
  { start: 0.54, x: [0, 42], y: [0, -38], scale: [0.4, 0.62], rot: [-4, 8], size: 'w-10 sm:w-14' },
];

export default function Hero() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });

  const copyY = useTransform(scrollYProgress, [0, 0.6, 1], reduce ? [0, 0, 0] : [0, -80, -80]);
  const copyOpacity = useTransform(scrollYProgress, [0, 0.35, 0.7, 1], reduce ? [1, 1, 1, 1] : [1, 1, 0, 0]);
  const skyProgress = useTransform(scrollYProgress, [0, 0.8, 1], [0, 1, 1]);

  // Pointer lean for the figure (≤ 6px), spring-smoothed.
  const px = useMotionValue(0);
  const lean = useSpring(px, { stiffness: 60, damping: 18 });
  useEffect(() => {
    if (reduce) return;
    const onMove = (e: PointerEvent) => px.set(((e.clientX / window.innerWidth) - 0.5) * 12);
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [px, reduce]);

  return (
    <section ref={ref} aria-labelledby="hero-title" className="relative h-[140svh] sm:h-[160svh]">
      <div className="sticky top-0 h-svh overflow-hidden">
        {/* Sky: living watercolor (Three.js) over a painted fallback; fills ~88% of initial screen */}
        <div className="absolute inset-x-0 top-0 bottom-[13%] sm:bottom-[11%] overflow-hidden">
          <WatercolorSky progress={skyProgress} fallbackSrc={ART.skyBold.src} />
          <DriftingBirds />
          {/* Subtle breath behind left copy without hiding the moving watercolor wash */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_62%_70%_at_18%_46%,rgba(250,248,245,0.34)_0%,transparent_72%)]"
          />
          {/* Clean horizon curve without stretched SVG filter artifacts */}
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-5 w-full"
            preserveAspectRatio="none"
            viewBox="0 0 100 5"
          >
            <path d="M0 5 L0 2.6 C22 1.9 42 3.2 64 2.3 C82 1.7 92 2.8 100 2.2 L100 5 Z" fill="#FAF8F5" />
          </svg>
        </div>

        {/* The whimsical traveler on the horizon, positioned cleanly for both 390px phones and desktop */}
        <div className="pointer-events-none absolute right-[4%] sm:right-[28%] bottom-[13%] sm:bottom-[11%] translate-y-[4%]">
          <m.div style={{ x: lean }} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ART.figure.src}
              alt=""
              draggable={false}
              className="h-[15svh] sm:h-[25svh] w-auto select-none"
            />
            {!reduce && (
              <m.div
                aria-hidden="true"
                initial={{ opacity: 0, x: 0, y: 0, scale: 0.45, rotate: -6 }}
                animate={{
                  opacity: [0, 0.95, 0.9, 0],
                  x: 210,
                  y: -185,
                  scale: 0.85,
                  rotate: 6,
                }}
                transition={{
                  x: { duration: 7.5, repeat: Infinity, repeatDelay: 1.5, ease: 'easeOut' },
                  y: { duration: 7.5, repeat: Infinity, repeatDelay: 1.5, ease: 'easeOut' },
                  scale: { duration: 7.5, repeat: Infinity, repeatDelay: 1.5, ease: 'easeOut' },
                  rotate: { duration: 7.5, repeat: Infinity, repeatDelay: 1.5, ease: 'easeOut' },
                  opacity: { duration: 7.5, repeat: Infinity, repeatDelay: 1.5, times: [0, 0.14, 0.78, 1], ease: 'linear' },
                }}
                className="absolute left-[14%] bottom-[26%] w-12 sm:w-16"
              >
                <WingedEnvelope className="w-full aspect-square" flapMs={400} />
              </m.div>
            )}
            {ENVELOPES.map((e, i) => (
              <Envelope key={i} spec={e} progress={scrollYProgress} reduce={Boolean(reduce)} />
            ))}
          </m.div>
        </div>

        {/* Clear scroll invitation in the bottom horizon strip */}
        <div className="pointer-events-none absolute inset-x-0 bottom-3 sm:bottom-4 z-10 flex justify-center">
          <span className="font-sans text-[13px] font-medium tracking-[0.14em] uppercase text-[var(--a-muted)]">
            Scroll to explore · Write → Tune → Ship ↓
          </span>
        </div>

        {/* Headline */}
        <m.div
          style={{ y: copyY, opacity: copyOpacity }}
          className="relative z-10 mx-auto flex h-full max-w-[1400px] flex-col justify-start px-5 sm:px-8 lg:px-12 pt-24 sm:pt-36"
        >
          <p className="font-sans text-[13px] font-semibold uppercase tracking-[0.16em] text-[var(--a-ink)]/70">
            <span className="text-[var(--a-accent)]">*</span>&nbsp; a Pipes tool for people who make things
          </p>
          <h1 id="hero-title" className="mt-5 font-display text-huge font-bold text-[var(--a-ink)]">
            <RiseLines immediate lines={['Say it once.', <span key="b" className="italic font-serif font-normal tracking-[-0.02em]">Let it travel.</span>]} />
          </h1>
          <p className="mt-6 max-w-[40ch] text-lg sm:text-xl leading-relaxed text-[var(--a-ink)]/80">
            Write one honest thought. asterisk tunes it for Threads, X, and four more rooms, checks the
            weather, and sends it on its way.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            <a
              href="#demo"
              {...bloomHandlers<HTMLAnchorElement>()}
              className="wc-cta inline-flex min-h-[52px] items-center gap-2 rounded-full bg-[var(--a-accent-fill)] px-7 text-base sm:text-lg font-semibold text-white no-underline shadow-[0_14px_36px_-14px_rgba(254,41,158,0.7)]"
            >
              Try the demo <span aria-hidden="true">↓</span>
            </a>
            <Link href="/login?intent=signup" className="wc-link min-h-[44px] inline-flex items-center text-base sm:text-lg font-semibold text-[var(--a-ink)]">
              Sign up
            </Link>
          </div>
          <p className="mt-3 text-[13px] text-[var(--a-ink)]/60">No account needed to try it.</p>
        </m.div>
      </div>
    </section>
  );
}

function Envelope({
  spec,
  progress,
  reduce,
}: {
  spec: (typeof ENVELOPES)[number];
  progress: ReturnType<typeof useScroll>['scrollYProgress'];
  reduce: boolean;
}) {
  const end = Math.min(0.98, spec.start + 0.4);
  const startOpacity = Math.max(0.01, spec.start - 0.02);
  const x = useTransform(progress, [0, spec.start, end, 1], [`${spec.x[0]}vw`, `${spec.x[0]}vw`, `${spec.x[1]}vw`, `${spec.x[1]}vw`]);
  const y = useTransform(progress, [0, spec.start, end, 1], [`${spec.y[0]}svh`, `${spec.y[0]}svh`, `${spec.y[1]}svh`, `${spec.y[1]}svh`]);
  const scale = useTransform(progress, [0, spec.start, end, 1], [spec.scale[0], spec.scale[0], spec.scale[1], spec.scale[1]]);
  const rotate = useTransform(progress, [0, spec.start, end, 1], [spec.rot[0], spec.rot[0], spec.rot[1], spec.rot[1]]);
  const opacity = useTransform(progress, [0, startOpacity, spec.start + 0.06, end - 0.05, end, 1], [0, 0, 1, 1, 0, 0]);
  if (reduce) return null;
  return (
    <m.div style={{ x, y, scale, rotate, opacity }} className={`absolute left-1/2 top-[10%] -translate-x-1/2 ${spec.size}`}>
      <WingedEnvelope className="w-full aspect-square" />
    </m.div>
  );
}
