'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronDown, Plus } from 'lucide-react';
import { useStudio } from '@/components/studio/StudioContext';
import { PLATFORM_SPECS } from '@/lib/platforms';

export default function StudioShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const rhythmRef = useRef<HTMLDetailsElement>(null);

  const {
    broadcasts,
    cadence,
    checklist,
    activePlatform,
    setActivePlatform,
    setDrawerOpen,
    handleNewNote,
    statusMessage,
    setStatusMessage,
    statusLinks,
    setStatusLinks,
  } = useStudio();

  useEffect(() => {
    const details = rhythmRef.current;
    if (!details) return;

    const onPointerDown = (e: PointerEvent) => {
      if (details.open && !details.contains(e.target as Node)) {
        details.open = false;
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (details.open && e.key === 'Escape') {
        details.open = false;
      }
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const doneCount = checklist.filter((c) => c.completed).length;
  const freshCount = cadence.filter((c) => c.state === 'fresh').length;

  const navItems = [
    { href: '/app', label: 'Write', active: pathname === '/app' || pathname === '/studio' },
    { href: '/app/rooms', label: 'Six Rooms', active: pathname === '/app/rooms' || pathname === '/studio/rooms' },
    {
      href: '/app/setup',
      label: checklist.length > 0 ? `Setup ${doneCount}/${checklist.length}` : 'Setup',
      active: pathname === '/app/setup' || pathname === '/studio/setup',
    },
  ];

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-clip flex flex-col bg-[var(--a-bg)] text-[var(--a-ink)]">
      {/* Compact single-row persistent header — fits cleanly inside 390px mobile viewports */}
      <header className="sticky top-0 z-40 border-b border-[var(--a-rule)] bg-[var(--a-bg)]/92 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-2 sm:gap-x-4 gap-y-1 px-4 sm:px-8 lg:px-10 py-2 sm:py-0 sm:h-16">
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/app"
              className="inline-flex min-h-[44px] items-center gap-1 font-display text-lg sm:text-2xl font-bold tracking-[-0.04em] text-[var(--a-ink)] no-underline whitespace-nowrap"
            >
              asterisk
              <span aria-hidden="true" className="font-display text-xl sm:text-2xl leading-none text-[var(--a-accent)]">
                *
              </span>
            </Link>
            <Link
              href="/"
              className="hidden md:inline-flex min-h-[44px] items-center font-sans text-[13px] font-medium text-[var(--a-muted)] hover:text-[var(--a-ink)]"
            >
              ← Story
            </Link>
          </div>

          {/* Right actions: collapsible Rhythm popover, # Hash drawer, + New, Sign out */}
          <div className="order-2 sm:order-3 flex items-center gap-1.5 sm:gap-3">
            {cadence.length > 0 && (
              <details ref={rhythmRef} className="relative">
                <summary
                  aria-label="Posting rhythm memory"
                  className="list-none inline-flex min-h-[44px] sm:min-h-[40px] items-center gap-1.5 rounded-full border border-[var(--a-rule)] bg-[var(--a-well)] px-2.5 sm:px-3 text-[13px] font-medium text-[var(--a-ink)] hover:border-[var(--a-accent)]/50 cursor-pointer whitespace-nowrap select-none"
                >
                  <span
                    aria-hidden="true"
                    className={`h-2 w-2 rounded-full ${
                      freshCount > 0 ? 'bg-[var(--a-emerald)]' : 'bg-[var(--a-muted)]/40'
                    }`}
                  />
                  <span>Rhythm</span>
                  <span className="hidden xs:inline sm:inline text-[var(--a-muted)] tabular-nums">
                    {freshCount}/{cadence.length}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-[var(--a-muted)]" aria-hidden="true" />
                </summary>

                <div className="absolute right-0 z-50 mt-2 w-[min(18rem,calc(100vw-2rem))] rounded-2xl border border-[var(--a-rule)] bg-[var(--a-well)] p-4 shadow-[0_20px_50px_-16px_rgba(42,47,69,0.28)] space-y-3">
                  <div className="space-y-0.5">
                    <p className="text-[13px] font-semibold text-[var(--a-ink)]">
                      Posting rhythm
                    </p>
                    <p className="text-[13px] text-[var(--a-muted)] leading-snug">
                      Optional memory of when each room last heard from you — no streaks or pressure.
                    </p>
                  </div>

                  <div className="divide-y divide-[var(--a-rule)] border-t border-[var(--a-rule)]">
                    {cadence.map((c) => {
                      const spec = PLATFORM_SPECS[c.platform];
                      const isSelected =
                        (pathname === '/app' || pathname === '/studio') &&
                        activePlatform === c.platform;
                      const dotColor =
                        c.state === 'fresh'
                          ? 'bg-[var(--a-emerald)]'
                          : c.state === 'never'
                            ? 'bg-[var(--a-muted)]/35'
                            : spec.tier === 'test'
                              ? 'bg-[var(--a-sky)]'
                              : 'bg-[var(--a-accent)]';
                      const labelText =
                        spec.tier === 'test' && c.state === 'never'
                          ? 'Test Mode'
                          : c.state === 'never'
                            ? 'Ready'
                            : c.badgeLabel;

                      return (
                        <button
                          key={c.platform}
                          type="button"
                          onClick={() => {
                            setActivePlatform(c.platform);
                            if (rhythmRef.current) rhythmRef.current.open = false;
                            if (pathname !== '/app') {
                              router.push(`/app?room=${c.platform}`);
                            }
                          }}
                          className={`flex w-full min-h-[40px] items-center justify-between gap-3 py-1.5 text-left text-[13px] cursor-pointer transition-colors ${
                            isSelected ? 'font-semibold text-[var(--a-accent-text)]' : 'text-[var(--a-ink)] hover:text-[var(--a-accent-text)]'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span className={`h-2 w-2 shrink-0 rounded-full ${dotColor}`} aria-hidden="true" />
                            <span>{spec.name}</span>
                          </span>
                          <span className="text-[var(--a-muted)] tabular-nums">{labelText}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </details>
            )}

            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="wc-link inline-flex min-h-[44px] items-center gap-1 px-1 font-sans text-[13px] font-medium text-[var(--a-ink)] cursor-pointer whitespace-nowrap"
            >
              <span aria-hidden="true" className="font-bold text-[var(--a-accent)]">
                #
              </span>
              <span>Hash ({broadcasts.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                handleNewNote();
                if (pathname !== '/app') router.push('/app');
              }}
              className="inline-flex min-h-[44px] sm:min-h-[40px] items-center gap-1 rounded-full bg-[var(--a-ink)] px-3 sm:px-4 text-[13px] sm:text-sm font-semibold text-[var(--a-bg)] hover:bg-[var(--a-accent-fill)] t-press t-color cursor-pointer whitespace-nowrap"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>New</span>
            </button>

            <form action="/api/auth/logout" method="POST" className="hidden sm:block">
              <button
                type="submit"
                className="min-h-[44px] px-1 font-sans text-[13px] font-medium text-[var(--a-muted)] hover:text-[var(--a-ink)] cursor-pointer"
              >
                Sign out
              </button>
            </form>
          </div>

          {/* App nav */}
          <nav
            aria-label="Workspace"
            className="order-3 sm:order-2 flex w-full sm:w-auto items-center gap-5 sm:gap-7 border-t border-[var(--a-rule)] sm:border-t-0"
          >
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={item.active ? 'page' : undefined}
                className={`relative inline-flex min-h-[44px] items-center px-0.5 text-sm font-medium whitespace-nowrap no-underline t-color ${
                  item.active
                    ? 'text-[var(--a-ink)]'
                    : 'text-[var(--a-muted)] hover:text-[var(--a-ink)]'
                }`}
              >
                <span>{item.label}</span>
                {item.active && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-0.5 bg-[var(--a-accent)]"
                  />
                )}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* Live status feedback + action links back to Hash / Personal Pipe */}
      <div role="status" aria-live="polite" className="mx-auto w-full max-w-6xl px-4 sm:px-8 lg:px-10">
        {statusMessage ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-l-2 border-[var(--a-accent)] bg-[var(--a-surface)] px-4 py-2 text-[14px] text-[var(--a-ink)]">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span>{statusMessage}</span>
              {statusLinks.map((lnk) => (
                <a
                  key={lnk.href}
                  href={lnk.href}
                  target="_blank"
                  rel="noopener"
                  className="wc-link font-semibold text-[var(--a-accent-text)] whitespace-nowrap"
                >
                  {lnk.label}
                </a>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                setStatusMessage('');
                setStatusLinks([]);
              }}
              className="min-h-[38px] shrink-0 whitespace-nowrap px-2 font-sans text-[13px] font-medium text-[var(--a-muted)] hover:text-[var(--a-ink)] cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        ) : null}
      </div>

      <main className="min-w-0 w-full flex-1">{children}</main>
    </div>
  );
}
