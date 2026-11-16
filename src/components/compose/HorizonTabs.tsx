'use client';

import React, { useId, useRef } from 'react';
import { m, useReducedMotion } from 'framer-motion';
import { PLATFORM_ORDER, PLATFORM_SPECS, type PlatformId } from '@/lib/platforms';
import { ART } from '@/lib/art-direction';

/**
 * Channel picker drawn as six painted birds resting on a horizon line.
 * Semantically a WAI-ARIA tablist: roving tabindex + Arrow/Home/End; single row that scrolls
 * inside itself on narrow screens. The selected bird lifts off the line.
 */
export default function HorizonTabs({
  active,
  onSelect,
  posted,
  idBase,
  label = 'Channels',
}: {
  active: PlatformId;
  onSelect: (p: PlatformId) => void;
  posted?: Partial<Record<PlatformId, boolean>>;
  idBase?: string;
  label?: string;
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
      e.key === 'ArrowRight' ? (idx + 1) % n : e.key === 'ArrowLeft' ? (idx - 1 + n) % n : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : null;
    if (next !== null) {
      e.preventDefault();
      select(PLATFORM_ORDER[next], true);
    }
  }

  return (
    <div className="relative min-w-0 w-full max-w-full">
      {/* The horizon line the birds rest on */}
      <svg aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-[10px] h-3 w-full" preserveAspectRatio="none" viewBox="0 0 100 4">
        <path d="M0 2.2 C20 1.6 38 2.8 55 2 C72 1.3 86 2.6 100 2" fill="none" stroke="var(--wc-ink)" strokeOpacity="0.22" strokeWidth="0.6" vectorEffect="non-scaling-stroke" filter="url(#wc-edge)" />
      </svg>

      <div role="tablist" aria-label={label} className="asterisk-tablist max-w-full gap-1 sm:gap-2">
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
              className={`group relative flex min-h-[64px] min-w-[64px] flex-col items-center justify-end gap-1 px-2.5 pb-1 text-[13px] font-medium cursor-pointer transition-colors ${
                selected ? 'text-[var(--a-ink)]' : 'text-[var(--a-muted)] hover:text-[var(--a-ink)]'
              }`}
            >
              <m.img
                src={ART.bird.src}
                alt=""
                aria-hidden="true"
                draggable={false}
                animate={reduce ? undefined : { y: selected ? -10 : 0, rotate: selected ? -12 : 0, scale: selected ? 1.15 : 1 }}
                whileHover={reduce || selected ? undefined : { y: -4, rotate: -6 }}
                transition={{ type: 'spring', stiffness: 320, damping: 20 }}
                className={`wc-glaze h-7 w-7 ${selected ? 'opacity-100' : 'opacity-55 group-hover:opacity-90'}`}
              />
              <span className="flex items-center gap-1 whitespace-nowrap">
                {spec.shortName}
                {spec.tier === 'test' && <span className="font-sans text-[13px] font-semibold text-[var(--a-sky-text)]">β</span>}
                {posted?.[pid] && <span aria-label="posted" className="text-[var(--a-emerald)]">•</span>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
