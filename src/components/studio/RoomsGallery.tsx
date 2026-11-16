'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { m, useReducedMotion } from 'framer-motion';
import { AccentResponsiveTable, Eyebrow } from 'accent-ui';
import DriftingBirds from '@/art/DriftingBirds';
import RoomAmbientOverlay from '@/art/RoomAmbientOverlay';
import WatercolorSky, { DAWN_PALETTE } from '@/art/WatercolorSky';
import { bloomHandlers } from '@/art/bloom';
import { ART, ROOM_ART } from '@/lib/art-direction';
import {
  PLATFORM_GUIDES,
  PLATFORM_ORDER,
  PLATFORM_SPECS,
  type PlatformId,
} from '@/lib/platforms';

interface RoomRow {
  id: PlatformId;
  name: string;
  audience: string;
  sweetSpot: string;
  linkPolicy: string;
  videoFit: string;
}

const ROOM_AURAS: Record<PlatformId, string> = {
  threads:
    'radial-gradient(60% 60% at 50% 45%, rgba(254,41,158,0.22), rgba(247,185,201,0.28) 52%, transparent 80%)',
  x: 'radial-gradient(60% 60% at 50% 45%, rgba(169,211,234,0.34), rgba(156,143,208,0.22) 52%, transparent 80%)',
  facebook:
    'radial-gradient(60% 60% at 50% 45%, rgba(250,214,184,0.38), rgba(247,185,201,0.22) 52%, transparent 80%)',
  substack:
    'radial-gradient(60% 60% at 50% 45%, rgba(156,143,208,0.28), rgba(250,214,184,0.24) 52%, transparent 80%)',
  instagram:
    'radial-gradient(60% 60% at 50% 45%, rgba(247,185,201,0.32), rgba(254,41,158,0.16) 52%, transparent 80%)',
  tiktok:
    'radial-gradient(60% 60% at 50% 45%, rgba(169,211,234,0.36), rgba(223,236,239,0.32) 55%, transparent 80%)',
};

export default function RoomsGallery() {
  const reduce = useReducedMotion();
  const [hoveredRoom, setHoveredRoom] = useState<PlatformId | null>(null);

  const matrixRows: RoomRow[] = PLATFORM_ORDER.map((pid) => {
    const spec = PLATFORM_SPECS[pid];
    return {
      id: pid,
      name: spec.name,
      audience: PLATFORM_GUIDES[pid].audiencePortrait,
      sweetSpot: `${spec.sweetSpotMin}–${spec.sweetSpotMax} chars`,
      linkPolicy: spec.linkPolicy,
      videoFit: spec.desktop16x9Friendly,
    };
  });

  return (
    <div className="space-y-16 pb-16">
      {/* Living watercolor masthead + 6-room quick-jump strip visible immediately above the fold */}
      <section className="relative overflow-hidden border-b border-[var(--a-rule)]">
        <WatercolorSky
          palette={DAWN_PALETTE}
          fallbackSrc={ART.skyBold.src}
          className="opacity-55"
        />
        <DriftingBirds />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[var(--a-bg)]/55 via-[var(--a-bg)]/70 to-[var(--a-bg)]"
        />

        <div className="relative z-10 mx-auto max-w-6xl px-5 sm:px-8 lg:px-10 py-10 sm:py-14 space-y-6">
          <div className="max-w-[46rem] space-y-4">
            <Eyebrow mark="*" color="var(--a-accent)">
              Six Rooms
            </Eyebrow>
            <h1 className="font-display text-big font-bold text-[var(--a-ink)]">
              Every room has{' '}
              <span className="font-serif italic font-normal">its own weather.</span>
            </h1>
            <p className="text-lg sm:text-xl leading-relaxed text-[var(--a-ink)]/80">
              Instead of learning six algorithms, learn who sits in each room—and jump straight to
              the sheet tuned for them.
            </p>
          </div>

          <nav aria-label="Jump to room" className="flex flex-wrap items-center gap-2.5 pt-1">
            {PLATFORM_ORDER.map((pid, idx) => {
              const spec = PLATFORM_SPECS[pid];
              return (
                <a
                  key={pid}
                  href={`#room-${pid}`}
                  className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-[var(--a-rule)] bg-[var(--a-bg)]/90 backdrop-blur-xs px-3.5 text-[13px] font-semibold text-[var(--a-ink)] no-underline hover:border-[var(--a-accent)] hover:text-[var(--a-accent-text)] transition-colors"
                >
                  <span className="font-serif text-[var(--a-muted)] tabular-nums">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <span>{spec.shortName}</span>
                </a>
              );
            })}
          </nav>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-5 sm:px-8 lg:px-10 space-y-20">
        {/* Six alternating watercolor room spreads with unique paper-textured choreography */}
        <div className="space-y-24 sm:space-y-28">
          {PLATFORM_ORDER.map((pid, idx) => {
            const spec = PLATFORM_SPECS[pid];
            const guide = PLATFORM_GUIDES[pid];
            const art = ROOM_ART[pid];
            const isEven = idx % 2 === 1;
            const isLit = hoveredRoom === pid;

            return (
              <article
                id={`room-${pid}`}
                key={pid}
                onPointerEnter={() => setHoveredRoom(pid)}
                onPointerLeave={() => setHoveredRoom((cur) => (cur === pid ? null : cur))}
                onFocus={() => setHoveredRoom(pid)}
                onBlur={() => setHoveredRoom((cur) => (cur === pid ? null : cur))}
                className={`scroll-mt-24 grid gap-10 lg:grid-cols-12 lg:items-center lg:gap-16 ${
                  idx > 0 ? 'border-t border-[var(--a-rule)] pt-12 sm:pt-16' : ''
                }`}
              >
                {/* Painting with paper texture, breathing aura & unique per-room Folon motion */}
                <div className={`lg:col-span-6 ${isEven ? 'lg:order-2' : 'lg:order-1'}`}>
                  <figure className="relative mx-auto max-w-[460px]">
                    <m.div
                      aria-hidden="true"
                      animate={
                        reduce
                          ? undefined
                          : {
                              opacity: isLit ? 0.95 : [0.48, 0.78, 0.48],
                              scale: isLit ? 1.05 : [0.97, 1.03, 0.97],
                            }
                      }
                      transition={
                        isLit
                          ? { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
                          : { duration: 7 + idx, repeat: Infinity, ease: 'easeInOut' }
                      }
                      className="pointer-events-none absolute -inset-5 -z-10 rounded-3xl blur-2xl"
                      style={{ background: ROOM_AURAS[pid] }}
                    />

                    <div className="wc-paper-grain relative overflow-hidden">
                      <m.div
                        animate={
                          reduce
                            ? undefined
                            : {
                                y: [0, -5, 0],
                                scale: isLit ? 1.025 : 1,
                              }
                        }
                        transition={{
                          y: { duration: 6.5 + idx * 0.6, repeat: Infinity, ease: 'easeInOut' },
                          scale: { duration: 0.65, ease: [0.22, 1, 0.36, 1] },
                        }}
                        className="relative will-change-transform"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={art.src}
                          srcSet={`${art.srcSmall} 640w, ${art.src} 1200w`}
                          sizes="(max-width: 1024px) 92vw, 460px"
                          alt={art.alt}
                          loading={idx < 2 ? 'eager' : 'lazy'}
                          className="block w-full aspect-[3/4] object-cover"
                        />
                      </m.div>

                      <RoomAmbientOverlay
                        platform={pid}
                        lit={isLit}
                        reducedMotion={Boolean(reduce)}
                      />
                    </div>
                  </figure>
                </div>

                {/* Editorial story + one CTA */}
                <div className={`lg:col-span-6 space-y-6 ${isEven ? 'lg:order-1' : 'lg:order-2'}`}>
                  <div className="flex items-baseline gap-3">
                    <span className="font-serif text-3xl text-[var(--a-muted)] tabular-nums">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span className="font-sans text-[13px] font-semibold uppercase tracking-[0.14em] text-[var(--a-accent-text)]">
                      {spec.tierLabel}
                    </span>
                  </div>

                  <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-[-0.03em] text-[var(--a-ink)]">
                    {spec.name}
                  </h2>

                  <p className="font-serif italic text-xl leading-relaxed text-[var(--a-ink)]/85">
                    {guide.audiencePortrait}
                  </p>

                  <ul className="space-y-2.5 text-[16px] leading-relaxed text-[var(--a-ink)]/80">
                    {guide.whatWins.slice(0, 3).map((tip) => (
                      <li key={tip} className="flex gap-2.5">
                        <span aria-hidden="true" className="font-display font-bold text-[var(--a-accent)]">
                          *
                        </span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>

                  <p className="border-l-2 border-[var(--a-rule)] pl-4 font-sans text-[13px] leading-relaxed text-[var(--a-muted)]">
                    Links: {spec.linkPolicy}. 16:9 video: {spec.desktop16x9Friendly}.
                  </p>

                  <div className="pt-2">
                    <Link
                      href={`/app?room=${pid}`}
                      {...bloomHandlers<HTMLAnchorElement>()}
                      className="wc-cta inline-flex min-h-[52px] items-center gap-2 rounded-full bg-[var(--a-accent-fill)] px-7 text-base font-semibold text-white no-underline shadow-[0_14px_36px_-14px_rgba(254,41,158,0.65)]"
                    >
                      <span>Write for {spec.shortName}</span>
                      <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* Collapsed side-by-side matrix (content-first noise reduction) */}
        <section className="border-t border-[var(--a-rule)] pt-10">
          <details>
            <summary className="min-h-[44px] inline-flex items-center gap-2 cursor-pointer font-display text-xl font-bold text-[var(--a-ink)] hover:text-[var(--a-accent-text)]">
              Compare all six side-by-side
            </summary>

            <div className="mt-6">
              <AccentResponsiveTable
                caption="Side-by-side comparison of the six asterisk channels"
                rows={matrixRows}
                getRowKey={(row) => row.id}
                columns={[
                  {
                    key: 'name',
                    header: 'Room',
                    isPrimary: true,
                    render: (row) => <span className="font-display font-bold">{row.name}</span>,
                  },
                  {
                    key: 'audience',
                    header: 'Who is inside',
                    render: (row) => <span className="text-sm">{row.audience}</span>,
                  },
                  {
                    key: 'sweet',
                    header: 'Sweet Spot',
                    render: (row) => (
                      <span className="font-sans text-[13px] tabular-nums">{row.sweetSpot}</span>
                    ),
                  },
                  {
                    key: 'links',
                    header: 'Link Rule',
                    render: (row) => <span className="text-sm">{row.linkPolicy}</span>,
                  },
                  {
                    key: 'video',
                    header: '16:9 Video',
                    render: (row) => <span className="text-sm">{row.videoFit}</span>,
                  },
                ]}
              />
            </div>
          </details>
        </section>
      </div>
    </div>
  );
}
