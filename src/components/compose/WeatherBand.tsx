'use client';

import React, { useState } from 'react';
import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import type { DraftAnalysis } from '@/lib/platforms';
import { readinessToWeather, WEATHER } from '@/lib/weather';

/**
 * The Pre-Flight check as weather: a painted wash that clears as the draft improves.
 * Only problems are shown by default; passing checks collapse behind a quiet toggle.
 */
export default function WeatherBand({
  analysis,
  onFix,
}: {
  analysis: DraftAnalysis;
  onFix?: (action: 'move_url_to_reply') => void;
}) {
  const reduce = useReducedMotion();
  const [showPasses, setShowPasses] = useState(false);
  const weather = readinessToWeather(analysis.readiness);
  const w = WEATHER[weather];
  const issues = analysis.checks.filter((c) => c.status !== 'pass');
  const passes = analysis.checks.filter((c) => c.status === 'pass');

  return (
    <section aria-label="Pre-flight weather" className="relative overflow-hidden">
      {/* Wash layers crossfade between weather states */}
      <div aria-hidden="true" className="absolute inset-0">
        <AnimatePresence initial={false}>
          <m.div
            key={weather}
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
          >
            <div className="absolute -inset-[10%] blur-[1.5px]" style={{ background: w.wash }} />
          </m.div>
        </AnimatePresence>
      </div>

      <div className="relative px-5 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1" aria-live="polite">
          <p className="font-display text-xl font-bold tracking-[-0.02em] text-[var(--a-ink)]">{w.label}</p>
          <p className="text-[15px] text-[var(--a-ink)]/75">{w.detail}</p>
        </div>

        {issues.length > 0 && (
          <ul className="mt-3 space-y-2">
            {issues.map((c) => (
              <li key={c.id} className="flex items-start justify-between gap-3 text-[15px] leading-relaxed">
                <span className="text-[var(--a-ink)]">
                  <span className="font-semibold">{c.label}.</span>{' '}
                  <span className="text-[var(--a-ink)]/75">{c.detail}</span>
                </span>
                {c.fixAction && onFix && (
                  <button
                    type="button"
                    onClick={() => onFix(c.fixAction!)}
                    className="wc-link shrink-0 min-h-[44px] text-[14px] font-semibold text-[var(--a-accent-text)] cursor-pointer"
                  >
                    Fix it
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {passes.length > 0 && (
          <div className="mt-2">
            <button
              type="button"
              aria-expanded={showPasses}
              onClick={() => setShowPasses((s) => !s)}
              className="min-h-[44px] font-sans text-[13px] font-medium text-[var(--a-ink)]/65 hover:text-[var(--a-ink)] cursor-pointer"
            >
              {passes.length} clear ✓ {showPasses ? '· hide' : '· show'}
            </button>
            {showPasses && (
              <ul className="space-y-1.5 pb-1">
                {passes.map((c) => (
                  <li key={c.id} className="text-[14px] text-[var(--a-ink)]/70">
                    <span className="font-semibold text-[var(--a-ink)]/85">{c.label}.</span> {c.detail}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
