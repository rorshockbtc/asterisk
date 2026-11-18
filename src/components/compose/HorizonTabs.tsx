'use client';

import React, { useId, useRef } from 'react';
import { m, useReducedMotion } from 'framer-motion';
import { PLATFORM_ORDER, PLATFORM_SPECS, type PlatformId } from '@/lib/platforms';

type TabKey = PlatformId | 'nostr';

/**
 * Unmistakably clickable segmented channel rail for selecting between the 6 rooms (plus optional Nostr).
 * Single-row horizontal tablist with roving tabindex, Arrow/Home/End keyboard navigation,
 * shared sliding active pill (`layoutId`), forced-colors-safe bottom border indicator, and optional auto-tour progress.
 */
export default function HorizonTabs({
  active,
  onSelect,
  posted,
  connected,
  idBase,
  label = 'Channels',
  autoProgress = false,
  showNostr = false,
  nostrSelected = false,
  nostrConnected = false,
  onSelectNostr,
}: {
  active: PlatformId;
  onSelect: (p: PlatformId) => void;
  posted?: Partial<Record<PlatformId, boolean>>;
  connected?: Partial<Record<PlatformId, boolean>>;
  idBase?: string;
  label?: string;
  autoProgress?: boolean;
  showNostr?: boolean;
  nostrSelected?: boolean;
  nostrConnected?: boolean;
  onSelectNostr?: () => void;
}) {
  const autoId = useId();
  const base = idBase ?? autoId;
  const reduce = useReducedMotion();
  const refs = useRef<Partial<Record<TabKey, HTMLButtonElement | null>>>({});

  const allKeys: TabKey[] = showNostr ? [...PLATFORM_ORDER, 'nostr'] : PLATFORM_ORDER;

  function scrollTabIntoView(el: HTMLButtonElement | null) {
    if (!el) return;
    el.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
      ...({ container: 'nearest' } as Record<string, string>),
    } as ScrollIntoViewOptions);
  }

  function selectPlatform(p: PlatformId, focus = false) {
    onSelect(p);
    const el = refs.current[p] ?? null;
    if (el) {
      if (focus) el.focus();
      scrollTabIntoView(el);
    }
  }

  function selectNostr(focus = false) {
    onSelectNostr?.();
    const el = refs.current.nostr ?? null;
    if (el) {
      if (focus) el.focus();
      scrollTabIntoView(el);
    }
  }

  function onKeyDown(e: React.KeyboardEvent, idx: number) {
    const n = allKeys.length;
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
      const key = allKeys[next];
      if (key === 'nostr') {
        selectNostr(true);
      } else {
        selectPlatform(key, true);
      }
    }
  }

  return (
    <div className="w-full max-w-full min-w-0 rounded-2xl border border-[var(--a-rule)] bg-[var(--a-surface)]/85 p-1.5">
      <div
        role="tablist"
        aria-label={label}
        className="flex flex-nowrap items-center gap-1 overflow-x-auto scroll-snap-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {PLATFORM_ORDER.map((pid, idx) => {
          const spec = PLATFORM_SPECS[pid];
          const selected = !nostrSelected && pid === active;
          const isPosted = Boolean(posted?.[pid]);
          const isConnected = Boolean(connected?.[pid]);
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
              onClick={() => selectPlatform(pid)}
              onKeyDown={(e) => onKeyDown(e, idx)}
              className={`relative flex-none sm:flex-1 min-w-[78px] sm:min-w-0 min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-[14px] font-semibold cursor-pointer whitespace-nowrap transition-colors aria-selected:after:content-[''] aria-selected:after:absolute aria-selected:after:inset-x-3 aria-selected:after:bottom-0.5 aria-selected:after:border-b-2 aria-selected:after:border-[var(--a-accent)] aria-selected:after:z-10 ${
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
                {isConnected && !isPosted && (
                  <span
                    aria-label="connected"
                    className={`h-1.5 w-1.5 rounded-full ${
                      selected ? 'bg-[#4ADE80]' : 'bg-[var(--a-emerald)]'
                    }`}
                  />
                )}
                <span>{spec.shortName}</span>
                {spec.tier === 'test' && (
                  <span
                    className={`font-sans text-[13px] font-semibold ${
                      selected ? 'text-[#7DD3FC]' : 'text-[var(--a-sky-text)]'
                    }`}
                  >
                    β
                  </span>
                )}
                {isPosted && (
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

        {showNostr && (
          <button
            ref={(el) => {
              refs.current.nostr = el;
            }}
            id={`${base}-tab-nostr`}
            type="button"
            role="tab"
            aria-selected={nostrSelected}
            tabIndex={nostrSelected ? 0 : -1}
            onClick={() => selectNostr()}
            onKeyDown={(e) => onKeyDown(e, PLATFORM_ORDER.length)}
            className={`relative flex-none sm:flex-1 min-w-[78px] sm:min-w-0 min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-[14px] font-semibold cursor-pointer whitespace-nowrap transition-colors aria-selected:after:content-[''] aria-selected:after:absolute aria-selected:after:inset-x-3 aria-selected:after:bottom-0.5 aria-selected:after:border-b-2 aria-selected:after:border-[var(--a-accent)] aria-selected:after:z-10 ${
              nostrSelected
                ? 'text-[var(--a-bg)]'
                : 'text-[var(--a-ink)]/75 hover:bg-[var(--a-well)] hover:text-[var(--a-ink)]'
            }`}
          >
            {nostrSelected && (
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
              {nostrConnected && (
                <span
                  aria-label="connected"
                  className={`h-1.5 w-1.5 rounded-full ${
                    nostrSelected ? 'bg-[#4ADE80]' : 'bg-[var(--a-emerald)]'
                  }`}
                />
              )}
              <span>Nostr</span>
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
