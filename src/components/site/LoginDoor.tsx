'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { m, useMotionValue, useReducedMotion, useSpring } from 'framer-motion';
import WingedEnvelope from '@/art/WingedEnvelope';
import { bloomHandlers } from '@/art/bloom';
import { ART } from '@/lib/art-direction';
import { PIPES_SIGNUP_URL, safeNextPath } from '@/lib/session';

export default function LoginDoor() {
  const params = useSearchParams();
  const reduce = useReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const [ctaHovered, setCtaHovered] = useState(false);

  const intent = params.get('intent') === 'signup' ? 'signup' : 'login';
  const unavailable = params.get('unavailable') === '1';
  const nextPath = safeNextPath(params.get('next'), '/app');

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const tiltX = useSpring(rawX, { stiffness: 70, damping: 20 });
  const tiltY = useSpring(rawY, { stiffness: 70, damping: 20 });

  useEffect(() => {
    if (reduce) return;
    const onMove = (e: PointerEvent) => {
      const rect = stageRef.current?.getBoundingClientRect();
      if (rect) {
        const nx = ((e.clientX - rect.left) / Math.max(rect.width, 1) - 0.5) * 14;
        const ny = ((e.clientY - rect.top) / Math.max(rect.height, 1) - 0.5) * 10;
        rawX.set(Math.max(-9, Math.min(9, nx)));
        rawY.set(Math.max(-7, Math.min(7, ny)));
        return;
      }
      rawX.set(((e.clientX / window.innerWidth) - 0.5) * 14);
      rawY.set(((e.clientY / window.innerHeight) - 0.5) * 10);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [rawX, rawY, reduce]);

  const externalSignupHref = PIPES_SIGNUP_URL;

  return (
    <div className="min-h-screen flex flex-col bg-[var(--a-bg)] text-[var(--a-ink)] overflow-x-clip">
      {/* Minimal quiet header */}
      <header className="mx-auto flex w-full max-w-[1400px] items-center justify-between px-5 sm:px-8 lg:px-12 h-16 sm:h-20">
        <Link
          href="/"
          className="inline-flex min-h-[44px] items-center gap-1.5 font-display text-[22px] font-bold tracking-[-0.04em] text-[var(--a-ink)] no-underline"
        >
          asterisk
          <span aria-hidden="true" className="font-display text-[26px] leading-none text-[var(--a-accent)]">
            *
          </span>
        </Link>
        <Link
          href="/"
          className="wc-link min-h-[44px] inline-flex items-center text-[15px] font-medium text-[var(--a-ink)]"
        >
          ← Back to story
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-[1400px] flex-1 items-center px-5 sm:px-8 lg:px-12 py-8 sm:py-12">
        <div ref={stageRef} className="grid w-full gap-10 lg:grid-cols-12 lg:items-center lg:gap-16">
          {/* Left: Interactive open-door painting with pointer parallax, warm aura & departing envelope */}
          <div className="lg:col-span-6">
            <figure
              onPointerEnter={() => setCtaHovered(true)}
              onPointerLeave={() => setCtaHovered(false)}
              className="relative mx-auto max-w-[460px]"
            >
              {/* Soft reactive watercolor pigment wash behind the doorway */}
              <m.div
                aria-hidden="true"
                animate={
                  reduce
                    ? undefined
                    : {
                        opacity: ctaHovered ? 0.95 : 0.65,
                        scale: ctaHovered ? 1.05 : 1,
                      }
                }
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="pointer-events-none absolute -inset-6 -z-10 rounded-[2rem] blur-2xl"
                style={{
                  background:
                    'radial-gradient(60% 60% at 50% 45%, rgba(254,41,158,0.22), rgba(247,185,201,0.28) 45%, rgba(169,211,234,0.18) 72%, transparent 86%)',
                }}
              />

              <div className="relative overflow-hidden">
                <m.div
                  style={reduce ? undefined : { x: tiltX, y: tiltY }}
                  animate={reduce ? undefined : { scale: ctaHovered ? 1.03 : 1 }}
                  transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
                  className="will-change-transform"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={ART.door.src}
                    srcSet={`${ART.door.srcSmall} 640w, ${ART.door.src} 1200w`}
                    sizes="(max-width: 1024px) 92vw, 460px"
                    alt={ART.door.alt}
                    className="block w-full aspect-[3/4] object-cover"
                  />
                </m.div>

                {/* Threshold glow reacting to button hover/focus */}
                {!reduce && (
                  <m.div
                    aria-hidden="true"
                    animate={{
                      opacity: ctaHovered ? 0.82 : undefined,
                      scale: ctaHovered ? 1.1 : 1,
                    }}
                    transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                    className={`pointer-events-none absolute inset-x-[26%] top-[32%] bottom-[8%] rounded-full bg-[radial-gradient(closest-side,rgba(254,41,158,0.36),rgba(250,214,184,0.22)_58%,transparent)] mix-blend-screen ${
                      ctaHovered ? '' : 'a-door-glow'
                    }`}
                  />
                )}

                {/* Gentle bird drifting across the open doorway */}
                {!reduce && (
                  <m.img
                    src={ART.bird.src}
                    alt=""
                    aria-hidden="true"
                    draggable={false}
                    initial={{ opacity: 0, x: -30, y: 18, scale: 0.72 }}
                    animate={{
                      opacity: [0, 0.9, 0.85, 0],
                      x: 240,
                      y: -85,
                      scale: 0.95,
                    }}
                    transition={{
                      x: { duration: 11, repeat: Infinity, repeatDelay: 3, ease: 'linear' },
                      y: { duration: 11, repeat: Infinity, repeatDelay: 3, ease: 'easeOut' },
                      scale: { duration: 11, repeat: Infinity, repeatDelay: 3, ease: 'easeOut' },
                      opacity: { duration: 11, repeat: Infinity, repeatDelay: 3, times: [0, 0.14, 0.82, 1], ease: 'linear' },
                    }}
                    className="wc-glaze pointer-events-none absolute left-[24%] top-[46%] h-10 w-10"
                  />
                )}

                {/* Winged envelope lifting out through the threshold */}
                {!reduce && (
                  <m.div
                    aria-hidden="true"
                    initial={{ opacity: 0, x: 0, y: 0, scale: 0.45, rotate: -8 }}
                    animate={{
                      opacity: [0, 0.92, 0.85, 0],
                      x: ctaHovered ? 140 : 105,
                      y: ctaHovered ? -145 : -115,
                      scale: ctaHovered ? 0.92 : 0.78,
                      rotate: 6,
                    }}
                    transition={{
                      x: { duration: 8.5, repeat: Infinity, repeatDelay: 2, ease: 'easeOut' },
                      y: { duration: 8.5, repeat: Infinity, repeatDelay: 2, ease: 'easeOut' },
                      scale: { duration: 8.5, repeat: Infinity, repeatDelay: 2, ease: 'easeOut' },
                      rotate: { duration: 8.5, repeat: Infinity, repeatDelay: 2, ease: 'easeOut' },
                      opacity: { duration: 8.5, repeat: Infinity, repeatDelay: 2, times: [0, 0.15, 0.78, 1], ease: 'linear' },
                    }}
                    className="pointer-events-none absolute left-[44%] top-[52%] w-12 sm:w-14"
                  >
                    <WingedEnvelope className="w-full aspect-square" flapMs={420} />
                  </m.div>
                )}
              </div>
            </figure>
          </div>

          {/* Right: Editorial invitation & account door */}
          <div className="lg:col-span-6 space-y-6">
            <p className="font-sans text-[13px] font-semibold uppercase tracking-[0.16em] text-[var(--a-muted)]">
              <span className="text-[var(--a-accent)]">*</span>&nbsp; Account Door
            </p>

            <h1 className="font-display text-big font-bold text-[var(--a-ink)]">
              {intent === 'signup' ? (
                <>
                  Create your{' '}
                  <span className="font-serif italic font-normal">account.</span>
                </>
              ) : (
                <>
                  Welcome back to{' '}
                  <span className="font-serif italic font-normal">asterisk.</span>
                </>
              )}
            </h1>

            <p className="max-w-[46ch] text-lg leading-relaxed text-[var(--a-ink)]/80">
              Signing in connects your composing desk, saved drafts in <strong>Hash</strong>,
              six-channel rhythm memory, and direct publishing to Threads and X across the{' '}
              <strong>Pipes</strong> ecosystem.
            </p>

            {unavailable && (
              <div
                role="status"
                className="border-l-2 border-[var(--a-accent)] bg-[var(--a-surface)] px-4 py-3 text-[15px] text-[var(--a-ink)]"
              >
                Hosted Clerk sign-in is being wired up now. Complete onboarding at{' '}
                <a
                  href={externalSignupHref}
                  target="_blank"
                  rel="noopener"
                  className="wc-link font-semibold text-[var(--a-accent-text)]"
                >
                  pipes.pink
                </a>{' '}
                or try the browser demo below.
              </div>
            )}

            <div className="pt-2 space-y-4">
              <form action="/api/auth/stub" method="POST">
                <input type="hidden" name="next" value={nextPath} />
                {(() => {
                  const bloom = bloomHandlers<HTMLButtonElement>();
                  return (
                    <button
                      type="submit"
                      {...bloom}
                      onPointerEnter={(e) => {
                        bloom.onPointerEnter(e);
                        setCtaHovered(true);
                      }}
                      onPointerLeave={() => setCtaHovered(false)}
                      onFocus={(e) => {
                        bloom.onFocus(e);
                        setCtaHovered(true);
                      }}
                      onBlur={() => setCtaHovered(false)}
                      className="wc-cta inline-flex min-h-[52px] items-center gap-2.5 rounded-full bg-[var(--a-accent-fill)] px-7 text-base sm:text-lg font-semibold text-white shadow-[0_14px_36px_-14px_rgba(254,41,158,0.7)] cursor-pointer"
                    >
                      <span>{intent === 'signup' ? 'Sign up' : 'Log in'}</span>
                      <span aria-hidden="true">→</span>
                    </button>
                  );
                })()}
              </form>

              <p className="text-[13px] text-[var(--a-muted)]">
                Local preview mode: enters the logged-in workspace immediately without external API keys.
              </p>
            </div>

            <div className="border-t border-[var(--a-rule)] pt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-[15px]">
              <a
                href={externalSignupHref}
                target="_blank"
                rel="noopener"
                className="wc-link min-h-[44px] inline-flex items-center font-semibold text-[var(--a-ink)]"
              >
                Continue onboarding on pipes.pink ↗
              </a>
              <Link
                href="/#demo"
                className="wc-link min-h-[44px] inline-flex items-center text-[var(--a-muted)] hover:text-[var(--a-ink)]"
              >
                Try the public demo without an account
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
