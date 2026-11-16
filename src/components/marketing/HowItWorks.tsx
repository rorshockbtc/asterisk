'use client';

import React, { useRef } from 'react';
import { m, useReducedMotion, useScroll, useTransform, type MotionValue } from 'framer-motion';
import WingedEnvelope from '@/art/WingedEnvelope';
import { ART } from '@/lib/art-direction';

const STEPS = [
  {
    n: '01',
    word: 'Write.',
    body: 'One thought, in your own words. Paste a link if you have one. No templates, no AI rewriting your voice.',
  },
  {
    n: '02',
    word: 'Tune.',
    body: 'asterisk shapes it for each room and checks the weather: length, hook, link placement, media fit. Grey skies tell you what to fix.',
  },
  {
    n: '03',
    word: 'Ship.',
    body: 'Publish straight to Threads and X, or copy and open the rest in one tap. Links move to the self-reply where they belong.',
  },
];

/** Painted washes that crossfade as the steps advance: overcast → dawn → clear. */
const WASHES = [
  'radial-gradient(70% 60% at 40% 35%, #C9C7D3 0%, #DCDAE2 45%, transparent 75%), radial-gradient(60% 50% at 70% 60%, #BFC0CC 0%, transparent 70%)',
  'radial-gradient(70% 60% at 45% 40%, #F7B9C9 0%, #FAD6B8 45%, transparent 76%), radial-gradient(55% 45% at 72% 30%, #C9B9E8 0%, transparent 70%)',
  'radial-gradient(75% 65% at 50% 40%, #A9D3EA 0%, #CFE6F2 48%, transparent 78%), radial-gradient(45% 40% at 30% 70%, #F7B9C9 0%, transparent 70%)',
];

export default function HowItWorks() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start center', 'end center'] });

  return (
    <section id="how" ref={ref} aria-labelledby="how-title" className="relative scroll-mt-20 bg-[var(--a-bg)] py-24 sm:py-36">
      <div className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12">
        <p className="font-sans text-[13px] font-semibold uppercase tracking-[0.16em] text-[var(--a-muted)]">How it works</p>
        <h2 id="how-title" className="mt-3 font-display text-big font-bold text-[var(--a-ink)]">
          From one thought <span className="font-serif italic font-normal">to every room.</span>
        </h2>

        <div className="mt-16 grid gap-12 lg:grid-cols-12">
          {/* Sticky painted stage */}
          <div className="lg:col-span-6 lg:order-2">
            <div className="lg:sticky lg:top-28">
              <div className="relative aspect-[4/5] sm:aspect-[5/4] lg:aspect-[4/5] overflow-hidden bg-[var(--wc-paper)]">
                {WASHES.map((bg, i) => (
                  <Wash key={i} index={i} background={bg} progress={scrollYProgress} reduce={Boolean(reduce)} />
                ))}
                <div className="wc-paper-grain absolute inset-0" aria-hidden="true" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={ART.figureRelease.src}
                  alt="A small figure in a long coat raising a hand toward the changing sky."
                  className="wc-glaze absolute bottom-[8%] left-[14%] h-[38%] w-auto"
                />
                <FlyingEnvelope progress={scrollYProgress} reduce={Boolean(reduce)} />
              </div>
            </div>
          </div>

          {/* Steps */}
          <ol className="lg:col-span-6 lg:order-1 space-y-20 lg:space-y-[38svh] lg:py-[12svh]">
            {STEPS.map((s, i) => (
              <Step key={s.n} step={s} index={i} progress={scrollYProgress} reduce={Boolean(reduce)} />
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function Wash({ index, background, progress, reduce }: { index: number; background: string; progress: MotionValue<number>; reduce: boolean }) {
  const ranges: [number[], number[]][] = [
    [[0, 0.3, 0.42, 1], [1, 1, 0, 0]],
    [[0, 0.3, 0.42, 0.62, 0.72, 1], [0, 0, 1, 1, 0, 0]],
    [[0, 0.62, 0.72, 1], [0, 0, 1, 1]],
  ];
  const [input, output] = ranges[index];
  const opacity = useTransform(progress, input, reduce ? output.map(() => (index === 2 ? 1 : 0)) : output);
  return (
    <m.div aria-hidden="true" style={{ opacity }} className="absolute inset-0 will-change-[opacity]">
      <div className="absolute -inset-[8%] blur-[2px]" style={{ background }} />
    </m.div>
  );
}

function FlyingEnvelope({ progress, reduce }: { progress: MotionValue<number>; reduce: boolean }) {
  const x = useTransform(progress, [0.7, 1], ['0%', '210%']);
  const y = useTransform(progress, [0.7, 1], ['0%', '-260%']);
  const opacity = useTransform(progress, [0.66, 0.72, 0.95, 1], [0, 1, 1, 0.9]);
  const rotate = useTransform(progress, [0.7, 1], [-10, 8]);
  if (reduce) return null;
  return (
    <m.div style={{ x, y, opacity, rotate }} className="absolute bottom-[34%] left-[26%] w-[18%]">
      <WingedEnvelope className="w-full aspect-square" />
    </m.div>
  );
}

function Step({
  step,
  index,
  progress,
  reduce,
}: {
  step: (typeof STEPS)[number];
  index: number;
  progress: MotionValue<number>;
  reduce: boolean;
}) {
  const center = [0.15, 0.5, 0.85][index];
  const opacity = useTransform(progress, [center - 0.25, center, center + 0.25], reduce ? [1, 1, 1] : [0.28, 1, 0.28]);
  return (
    <m.li style={{ opacity }} className="space-y-4">
      <span className="font-display text-2xl font-bold text-[var(--a-ink)]/30 tabular-nums">{step.n}</span>
      <h3 className="font-display text-huge font-bold text-[var(--a-ink)]">
        {index === 2 ? <span className="text-[var(--a-accent)]">{step.word}</span> : step.word}
      </h3>
      <p className="max-w-[38ch] text-lg sm:text-xl leading-relaxed text-[var(--a-ink)]/75">{step.body}</p>
    </m.li>
  );
}
