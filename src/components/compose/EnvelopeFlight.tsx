'use client';

import React, { useCallback, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, m } from 'framer-motion';
import WingedEnvelope from '@/art/WingedEnvelope';

const noopSubscribe = () => () => {};

interface Flight {
  id: number;
  x: number;
  y: number;
}

/**
 * Publish moment: a winged envelope lifts from the button that was pressed and flies off
 * up and to the right. Skipped entirely under reduced motion (the status message still announces).
 */
export function useEnvelopeFlight() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );

  const launch = useCallback((from: HTMLElement | null) => {
    if (!from || typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const r = from.getBoundingClientRect();
    const id = Date.now() + Math.random();
    setFlights((f) => [...f, { id, x: r.left + r.width / 2, y: r.top + r.height / 2 }]);
    window.setTimeout(() => setFlights((f) => f.filter((x) => x.id !== id)), 2200);
  }, []);

  const layer = !mounted
    ? null
      : createPortal(
          <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[60]">
            <AnimatePresence>
              {flights.map((f) => (
                <m.div
                  key={f.id}
                  initial={{ x: f.x - 40, y: f.y - 40, scale: 0.3, opacity: 0, rotate: 0 }}
                  animate={{
                    x: [f.x - 40, f.x + 40, f.x + 260],
                    y: [f.y - 40, f.y - 160, f.y - 520],
                    scale: [0.3, 1, 0.7],
                    opacity: [0, 1, 0],
                    rotate: [0, -8, 6],
                  }}
                  transition={{ duration: 2, ease: [0.22, 1, 0.36, 1], times: [0, 0.35, 1] }}
                  className="absolute left-0 top-0 h-20 w-20"
                >
                  <WingedEnvelope className="h-full w-full" flapMs={220} />
                </m.div>
              ))}
            </AnimatePresence>
          </div>,
          document.body
        );

  return { launch, layer };
}
