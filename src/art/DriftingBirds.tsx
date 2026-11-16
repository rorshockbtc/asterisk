'use client';

import React from 'react';
import { m, useReducedMotion } from 'framer-motion';
import { ART } from '@/lib/art-direction';

/**
 * A small flock of painted birds gliding smoothly from left to right and receding
 * into the upper-right sky. Uses single 2-point linear motion (zero waypoint pauses).
 */
const FLOCK = [
  { top: '20%', width: 62, dur: 34, delay: -6, driftY: -120 },
  { top: '29%', width: 46, dur: 42, delay: -19, driftY: -95 },
  { top: '14%', width: 38, dur: 48, delay: -31, driftY: -135 },
  { top: '34%', width: 52, dur: 38, delay: -12, driftY: -105 },
];

export default function DriftingBirds({ className = '' }: { className?: string }) {
  const reduce = useReducedMotion();

  if (reduce) {
    return (
      <div aria-hidden="true" className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ART.bird.src}
          alt=""
          draggable={false}
          style={{ top: '20%', left: '58%', width: 48 }}
          className="absolute opacity-80"
        />
      </div>
    );
  }

  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {FLOCK.map((b, i) => (
        <m.div
          key={i}
          style={{ top: b.top, width: b.width }}
          className="absolute left-0"
          initial={{ x: '-10vw', y: 0, scale: 1, opacity: 0 }}
          animate={{
            x: '110vw',
            y: b.driftY,
            scale: 0.45,
            opacity: [0, 0.9, 0.72, 0],
          }}
          transition={{
            x: { duration: b.dur, delay: b.delay, repeat: Infinity, ease: 'linear' },
            y: { duration: b.dur, delay: b.delay, repeat: Infinity, ease: 'linear' },
            scale: { duration: b.dur, delay: b.delay, repeat: Infinity, ease: 'linear' },
            opacity: {
              duration: b.dur,
              delay: b.delay,
              repeat: Infinity,
              times: [0, 0.08, 0.85, 1],
              ease: 'linear',
            },
          }}
        >
          <m.img
            src={ART.bird.src}
            alt=""
            draggable={false}
            className="block w-full h-auto"
            animate={{ y: [-7, 7], rotate: [-2.5, 2.5] }}
            transition={{ duration: 3.4 + i * 0.4, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
          />
        </m.div>
      ))}
    </div>
  );
}
