'use client';

import React, { useId, useRef } from 'react';
import { m, useReducedMotion } from 'framer-motion';
import { PLATFORM_ORDER, PLATFORM_SPECS, type PlatformId } from '@/lib/platforms';

/**
 * Unmistakably clickable segmented channel rail for selecting between the 6 rooms.
 * WAI-ARIA tablist with roving tabindex, Arrow/Home/End keyboard navigation,
 * a shared sliding active pill (`layoutId`), and optional auto-tour progress bar.
 */
export default function HorizonTabs({
  active,
  onSelect,
  posted,
  idBase,
  label = 'Channels',
  autoProgress = false,
}: {
  active: PlatformId;
  onSelect: (p: PlatformId) => void;
  posted?: Partial<Record<PlatformId, boolean>>;
  idBase?: string;
  label?: string;
  autoProgress?: boolean;
}) {
  const autoId = useId();
  const base = idBase ?? autoId;
  const reduce = useReducedMotion();
  const refs = useRef<Partial<Record<PlatformId, HTMLButtonElement | null>>>({});

  function select(p: PlatformId, focus = false) {
    onSelect(p);
    const el = refs.current[p];
    if (el) {
      if (focus) el.focus();
      el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }

  function onKeyDown(e: React.KeyboardEvent, idx: number) {
    const n = PLATFORM_ORDER.length;
    const next =
      e.key === 'ArrowRight'
        ? (idx + 1) % n
        : e.key === 'ArrowLeft'
          ? (idx - 1 + n) % n
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? n - 1
              : null;
    if (next !== null) {
      e.preventDefault();
      select(PLATFORM_ORDER[next], true);
    }
  }

  return (
    <div className="w-full max-w-full min-w-0 rounded-2xl border border-[var(--a-rule)] bg-[var(--a-surface)]/85 p-1.5">
      <div
        role="tablist"
        aria-label={label}
        className="flex flex-nowrap sm:flex-wrap items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {PLATFORM_ORDER.map((pid, idx) => {
          const spec = PLATFORM_SPECS[pid];
          const selected = pid === active;
          return (
            <button
              key={pid}
              ref={(el) => {
                refs.current[pid] = el;
              }}
              id={`${base}-tab-${pid}`}
              type="button"
              role="tab"
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => select(pid)}
              onKeyDown={(e) => onKeyDown(e, idx)}
              className={`relative flex-none sm:flex-1 min-w-[78px] sm:min-w-0 min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[14px] font-semibold cursor-pointer whitespace-nowrap transition-colors ${
                selected
                  ? 'text-[var(--a-bg)]'
                  : 'text-[var(--a-ink)]/75 hover:bg-[var(--a-well)] hover:text-[var(--a-ink)]'
              }`}
            >
              {selected && (
                <m.span
                  layoutId={`${base}-active-pill`}
                  transition={
                    reduce
                      ? { duration: 0 }
                      : { type: 'spring', stiffness: 420, damping: 34 }
                  }
                  aria-hidden="true"
                  className="absolute inset-0 rounded-xl bg-[var(--a-ink)] shadow-sm"
                />
              )}

              <span className="relative z-10 inline-flex items-center gap-1.5">
                <span>{spec.shortName}</span>
                {spec.tier === 'test' && (
                  <span
                    className={`font-sans text-[12px] font-semibold ${
                      selected ? 'text-[#7DD3FC]' : 'text-[var(--a-sky-text)]'
                    }`}
                  >
                    β
                  </span>
                )}
                {posted?.[pid] && (
                  <span aria-label="posted" className="text-[var(--a-emerald)]">
                    •
                  </span>
                )}
              </span>

              {selected && autoProgress && !reduce && (
                <m.span
                  key={`progress-${pid}`}
                  aria-hidden="true"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 3.4, ease: 'linear' }}
                  className="pointer-events-none absolute inset-x-2.5 bottom-1 z-10 h-[2px] origin-left rounded-full bg-[var(--a-accent)]"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
