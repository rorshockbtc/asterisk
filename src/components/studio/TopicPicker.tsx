'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { TOPIC_DESCRIPTIONS, TOPIC_OPTIONS } from '@/lib/platforms';

/**
 * Custom styled Topic picker replacing native OS <select> menus.
 * Matches the Accént paper surface, tight watercolor chevron, and keyboard ARIA listbox contract.
 */
export default function TopicPicker({
  value,
  onChange,
  label = 'Topic',
}: {
  value: string;
  onChange: (next: string) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [focusedIdx, setFocusedIdx] = useState(() =>
    Math.max(0, TOPIC_OPTIONS.indexOf(value as (typeof TOPIC_OPTIONS)[number]))
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const labelId = useId();
  const listboxId = useId();

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  function openMenu() {
    const activeIndex = Math.max(
      0,
      TOPIC_OPTIONS.indexOf(value as (typeof TOPIC_OPTIONS)[number])
    );
    setFocusedIdx(activeIndex);
    setOpen(true);
    requestAnimationFrame(() => {
      optionRefs.current[activeIndex]?.focus();
    });
  }

  function handleListKeyDown(e: React.KeyboardEvent) {
    const count = TOPIC_OPTIONS.length;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = (focusedIdx + 1) % count;
      setFocusedIdx(next);
      optionRefs.current[next]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = (focusedIdx - 1 + count) % count;
      setFocusedIdx(prev);
      optionRefs.current[prev]?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      setFocusedIdx(0);
      optionRefs.current[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      setFocusedIdx(count - 1);
      optionRefs.current[count - 1]?.focus();
    }
  }

  return (
    <div ref={rootRef} className="relative inline-block">
      <span id={labelId} className="sr-only">
        {label}
      </span>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={labelId}
        aria-controls={listboxId}
        onClick={() => (open ? setOpen(false) : openMenu())}
        className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-[var(--a-rule)] bg-[var(--a-well)] pl-3.5 pr-3 text-[14px] font-semibold text-[var(--a-ink)] shadow-[0_1px_2px_rgba(17,24,39,0.04)] transition-colors hover:border-[var(--a-accent)]/55 focus-visible:outline-2 focus-visible:outline-[var(--a-accent)] cursor-pointer whitespace-nowrap"
      >
        <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[var(--a-accent)]" />
        <span>{value}</span>
        <ChevronDown
          aria-hidden="true"
          className={`h-3.5 w-3.5 text-[var(--a-accent-text)] transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div
          id={listboxId}
          role="listbox"
          aria-labelledby={labelId}
          onKeyDown={handleListKeyDown}
          className="absolute left-0 sm:left-auto sm:right-0 z-50 mt-2 w-[min(18rem,calc(100vw-2rem))] rounded-2xl border border-[var(--a-rule)] bg-[var(--a-well)] p-1.5 shadow-[0_20px_50px_-16px_rgba(42,47,69,0.28)]"
        >
          {TOPIC_OPTIONS.map((opt, idx) => {
            const selected = opt === value;
            return (
              <button
                key={opt}
                ref={(el) => {
                  optionRefs.current[idx] = el;
                }}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                className={`flex w-full items-start justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors cursor-pointer ${
                  selected
                    ? 'bg-[var(--a-surface)] text-[var(--a-ink)]'
                    : 'text-[var(--a-ink)] hover:bg-[var(--a-bg)]'
                }`}
              >
                <span className="space-y-0.5">
                  <span className="block text-[14px] font-semibold leading-tight">{opt}</span>
                  <span className="block text-[13px] text-[var(--a-muted)] leading-snug">
                    {TOPIC_DESCRIPTIONS[opt]}
                  </span>
                </span>
                {selected && (
                  <Check
                    aria-hidden="true"
                    className="mt-0.5 h-4 w-4 shrink-0 text-[var(--a-accent)]"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
