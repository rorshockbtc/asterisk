'use client';

import React from 'react';
import { m } from 'framer-motion';
import type { PlatformId } from '@/lib/platforms';

/**
 * Six distinct, paper-textured ambient animations—one calibrated metaphor per Room.
 * Uses CSS `.wc-textured-motif` cold-press masking so motion feels painted into paper
 * rather than repeating a single bird sticker across all six plates.
 */
export default function RoomAmbientOverlay({
  platform,
  lit = false,
  reducedMotion = false,
}: {
  platform: PlatformId;
  lit?: boolean;
  reducedMotion?: boolean;
}) {
  if (reducedMotion) {
    return (
      <div
        aria-hidden="true"
        data-room-motif={platform}
        className="wc-textured-motif pointer-events-none absolute inset-0"
      />
    );
  }

  switch (platform) {
    case 'threads':
      // Luminous bead traveling along the horizon thread + rising conversational motes
      return (
        <div
          aria-hidden="true"
          data-room-motif="threads"
          className="wc-textured-motif pointer-events-none absolute inset-0 overflow-hidden"
        >
          <m.div
            animate={{ x: ['8%', '86%', '8%'], y: [0, 3, 0], opacity: [0.55, 0.95, 0.55] }}
            transition={{ duration: lit ? 5.5 : 9, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-[52%] left-0 h-5 w-5 rounded-full bg-[radial-gradient(circle,#FE299E_0%,#FAD6B8_55%,transparent_75%)] blur-[0.5px]"
          />
          {[0, 1, 2].map((i) => (
            <m.div
              key={i}
              animate={{
                y: [16, -90],
                opacity: [0, 0.72, 0],
                scale: [0.7, 1.15, 0.85],
              }}
              transition={{
                duration: 6 + i * 1.4,
                delay: i * 1.8,
                repeat: Infinity,
                ease: 'easeOut',
              }}
              style={{ left: `${24 + i * 24}%`, top: `${42 - (i % 2) * 8}%` }}
              className="absolute h-4 w-4 rounded-full bg-[radial-gradient(circle,rgba(254,41,158,0.45),rgba(247,185,201,0.22),transparent)]"
            />
          ))}
        </div>
      );

    case 'x':
      // Folded watercolor paper airplane banking softly across a curved slipstream
      return (
        <div
          aria-hidden="true"
          data-room-motif="x"
          className="wc-textured-motif pointer-events-none absolute inset-0 overflow-hidden"
        >
          <m.div
            initial={{ x: '-14%', y: '18%', rotate: -14, opacity: 0 }}
            animate={{
              x: ['-14%', '45%', '108%'],
              y: ['24%', '8%', '-12%'],
              rotate: [-14, -6, 6],
              opacity: [0, 0.95, 0.9, 0],
            }}
            transition={{
              duration: lit ? 6.5 : 10,
              repeat: Infinity,
              repeatDelay: 2.2,
              ease: 'easeInOut',
            }}
            className="absolute left-0 top-[22%] w-16"
          >
            <svg viewBox="0 0 80 48" className="h-auto w-full drop-shadow-sm">
              <polygon
                points="4,28 74,8 26,34"
                fill="#A9D3EA"
                fillOpacity="0.92"
                filter="url(#wc-bleed)"
              />
              <polygon
                points="26,34 74,8 52,40"
                fill="#9C8FD0"
                fillOpacity="0.78"
              />
              <polygon
                points="26,34 38,37 31,44"
                fill="#2A2F45"
                fillOpacity="0.45"
              />
            </svg>
          </m.div>
        </div>
      );

    case 'facebook':
      // Concentric warm porch-lantern ripples & gentle firefly warmth
      return (
        <div
          aria-hidden="true"
          data-room-motif="facebook"
          className="wc-textured-motif pointer-events-none absolute inset-0 overflow-hidden"
        >
          {[0, 1].map((ring) => (
            <m.div
              key={ring}
              animate={{
                scale: [0.65, 1.35],
                opacity: [0.55, 0],
              }}
              transition={{
                duration: lit ? 4.2 : 6.4,
                delay: ring * 3.1,
                repeat: Infinity,
                ease: 'easeOut',
              }}
              className="absolute left-1/2 top-[48%] h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#FAD6B8]/70 bg-[radial-gradient(circle,rgba(250,214,184,0.22),transparent_68%)]"
            />
          ))}
        </div>
      );

    case 'substack':
      // Slowly drifting manuscript sheets falling with a gentle pendulum sway
      return (
        <div
          aria-hidden="true"
          data-room-motif="substack"
          className="wc-textured-motif pointer-events-none absolute inset-0 overflow-hidden"
        >
          {[
            { left: '22%', delay: 0, dur: 9.5, rot: [-9, 8, -7] },
            { left: '54%', delay: 2.8, dur: 11, rot: [8, -9, 6] },
            { left: '74%', delay: 5.5, dur: 10.2, rot: [-6, 10, -8] },
          ].map((page, i) => (
            <m.div
              key={i}
              initial={{ y: '-12%', opacity: 0 }}
              animate={{
                y: ['-8%', '106%'],
                x: [-8, 12, -6],
                rotate: page.rot,
                opacity: [0, 0.85, 0.8, 0],
              }}
              transition={{
                duration: lit ? page.dur * 0.78 : page.dur,
                delay: page.delay,
                repeat: Infinity,
                ease: 'linear',
              }}
              style={{ left: page.left }}
              className="absolute top-0"
            >
              <svg viewBox="0 0 28 36" className="h-8 w-6">
                <rect
                  x="2"
                  y="2"
                  width="24"
                  height="32"
                  rx="2"
                  fill="#FAF8F5"
                  fillOpacity="0.88"
                  stroke="#9C8FD0"
                  strokeOpacity="0.55"
                  strokeWidth="1.5"
                />
                <line x1="7" y1="11" x2="21" y2="11" stroke="#2A2F45" strokeOpacity="0.35" strokeWidth="1.4" />
                <line x1="7" y1="17" x2="19" y2="17" stroke="#2A2F45" strokeOpacity="0.28" strokeWidth="1.4" />
                <line x1="7" y1="23" x2="16" y2="23" stroke="#FE299E" strokeOpacity="0.45" strokeWidth="1.4" />
              </svg>
            </m.div>
          ))}
        </div>
      );

    case 'instagram':
      // Prismatic translucent watercolor bokeh & corner light leak
      return (
        <div
          aria-hidden="true"
          data-room-motif="instagram"
          className="wc-textured-motif pointer-events-none absolute inset-0 overflow-hidden"
        >
          <m.div
            animate={{
              x: [-18, 28, -18],
              y: [-10, 24, -10],
              opacity: [0.42, 0.78, 0.42],
              scale: [0.95, 1.15, 0.95],
            }}
            transition={{ duration: lit ? 5 : 8.5, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute left-[14%] top-[18%] h-36 w-36 rounded-full bg-[radial-gradient(circle,rgba(254,41,158,0.28),rgba(247,185,201,0.18)_55%,transparent)] blur-lg"
          />
          <m.div
            animate={{
              x: [16, -24, 16],
              y: [18, -18, 18],
              opacity: [0.35, 0.68, 0.35],
              scale: [1.05, 0.9, 1.05],
            }}
            transition={{ duration: 9.5, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute right-[12%] bottom-[22%] h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(156,143,208,0.34),rgba(250,214,184,0.22)_58%,transparent)] blur-lg"
          />
        </div>
      );

    case 'tiktok':
      // Ascending vertical cadence ripples
      return (
        <div
          aria-hidden="true"
          data-room-motif="tiktok"
          className="wc-textured-motif pointer-events-none absolute inset-0 overflow-hidden"
        >
          {[0, 1, 2].map((i) => (
            <m.div
              key={i}
              initial={{ y: 20, opacity: 0, scale: 0.7 }}
              animate={{
                y: [10, -240],
                opacity: [0, 0.78, 0],
                scale: [0.75, 1.2],
              }}
              transition={{
                duration: lit ? 4.8 : 7.5,
                delay: i * 2.4,
                repeat: Infinity,
                ease: 'easeOut',
              }}
              style={{ left: `${26 + i * 22}%` }}
              className="absolute bottom-[14%] h-10 w-10 rounded-full border border-[#A9D3EA]/80 bg-[radial-gradient(circle,rgba(169,211,234,0.26),transparent_70%)]"
            />
          ))}
        </div>
      );
  }
}
