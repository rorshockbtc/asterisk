'use client';

import React, { useEffect, useState } from 'react';
import { ART } from '@/lib/art-direction';

/**
 * Winged envelope with a two-frame wash-wing flap (wings up / wings down).
 * Falls back to a single frame when frames are missing or motion is reduced.
 */
export default function WingedEnvelope({
  className = '',
  flapMs = 520,
  flapping = true,
}: {
  className?: string;
  flapMs?: number;
  flapping?: boolean;
}) {
  const [down, setDown] = useState(false);

  useEffect(() => {
    if (!flapping) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => setDown((d) => !d), flapMs);
    return () => window.clearInterval(id);
  }, [flapping, flapMs]);

  return (
    <span className={`relative inline-block ${className}`} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={ART.envelopeUp.src} alt="" className="wc-glaze block h-full w-full object-contain" style={{ opacity: down ? 0 : 1 }} draggable={false} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={ART.envelopeDown.src} alt="" className="wc-glaze absolute inset-0 block h-full w-full object-contain" style={{ opacity: down ? 1 : 0 }} draggable={false} />
    </span>
  );
}
