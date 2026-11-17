'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { bloomHandlers } from '@/art/bloom';
import { useSessionStatus } from '@/lib/use-session-status';

type HomeSectionId = 'how' | 'demo' | 'open';

const JUMP_SECTIONS: { id: HomeSectionId; label: string }[] = [
  { id: 'how', label: 'How it works' },
  { id: 'demo', label: 'Try it' },
  { id: 'open', label: 'Open source' },
];

/**
 * Marketing header.
 * - Product CTAs: concise "Log in" and "Sign up" (Pipes onboarding hosts its own landing context).
 * - Desktop (`md+`): single-row nav with scroll-spy underline and jump arrows.
 * - Mobile (`< md`): "Sign up" pill + compact "Menu ▾" disclosure.
 */
export default function SiteHeader() {
  const pathname = usePathname();
  const isHome = pathname === '/';
  const { authenticated, pipesSignedIn } = useSessionStatus();
  const isLoggedIn = authenticated || pipesSignedIn;
  const loginNext = pathname && pathname !== '/' && pathname !== '/login' ? pathname : '/app';
  const loginHref = `/login?next=${encodeURIComponent(loginNext)}`;
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState<HomeSectionId | null>(null);
  const mobileMenuRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    let rafId = 0;

    const measure = () => {
      rafId = 0;
      setScrolled(window.scrollY > 24);

      if (!isHome) {
        setActiveSection(null);
        return;
      }

      const probeY = window.innerHeight * 0.36;
      let nextActive: HomeSectionId | null = null;
      for (const sec of JUMP_SECTIONS) {
        const el = document.getElementById(sec.id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.top <= probeY && rect.bottom >= 96) {
          nextActive = sec.id;
        }
      }
      setActiveSection(nextActive);
    };

    const schedule = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(measure);
    };

    schedule();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [isHome]);

  useEffect(() => {
    const details = mobileMenuRef.current;
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

  function closeMobileMenu() {
    if (mobileMenuRef.current) mobileMenuRef.current.open = false;
  }

  function scrollTopInstant() {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-300 ${
        scrolled
          ? 'border-b border-[var(--a-rule)] bg-[var(--a-bg)]/88 backdrop-blur-md'
          : 'border-b border-transparent bg-transparent'
      }`}
    >
      <div className="mx-auto flex h-16 sm:h-20 max-w-[1400px] items-center justify-between gap-4 px-5 sm:px-8 lg:px-12">
        <Link
          href="/"
          scroll
          onClick={scrollTopInstant}
          className="inline-flex min-h-[44px] items-center gap-1.5 font-display text-[22px] sm:text-2xl font-bold tracking-[-0.04em] text-[var(--a-ink)] no-underline"
        >
          asterisk
          <span aria-hidden="true" className="font-display text-[26px] leading-none text-[var(--a-accent)]">
            *
          </span>
        </Link>

        <nav aria-label="Main" className="hidden md:flex items-center gap-7 text-[15px] font-medium">
          {JUMP_SECTIONS.map((sec) => {
            const active = isHome && activeSection === sec.id;
            const href = isHome ? `#${sec.id}` : `/#${sec.id}`;
            return (
              <Link
                key={sec.id}
                href={href}
                data-active={active ? 'true' : undefined}
                aria-current={active ? 'location' : undefined}
                className={`group wc-link inline-flex min-h-[44px] items-center gap-1 whitespace-nowrap ${
                  active ? 'font-semibold text-[var(--a-accent-text)]' : 'text-[var(--a-ink)]'
                }`}
              >
                <span>{sec.label}</span>
                <span
                  aria-hidden="true"
                  className={`text-[12px] leading-none transition-transform duration-200 group-hover:translate-y-0.5 ${
                    active ? 'opacity-90 text-[var(--a-accent)]' : 'opacity-45 group-hover:opacity-85'
                  }`}
                >
                  ↓
                </span>
              </Link>
            );
          })}
          <Link
            href="/colophon"
            scroll
            onClick={scrollTopInstant}
            data-active={pathname === '/colophon' ? 'true' : undefined}
            aria-current={pathname === '/colophon' ? 'page' : undefined}
            className={`wc-link inline-flex min-h-[44px] items-center whitespace-nowrap ${
              pathname === '/colophon'
                ? 'font-semibold text-[var(--a-accent-text)]'
                : 'text-[var(--a-ink)]'
            }`}
          >
            Colophon
          </Link>
        </nav>

        <div className="flex items-center gap-2 sm:gap-4">
          <details ref={mobileMenuRef} className="relative md:hidden">
            <summary
              aria-label="Navigation menu"
              className="list-none inline-flex min-h-[44px] items-center gap-1 rounded-full border border-[var(--a-rule)] bg-[var(--a-bg)]/90 px-3 text-[13px] font-semibold text-[var(--a-ink)] cursor-pointer select-none"
            >
              <span>Menu</span>
              <ChevronDown className="h-3.5 w-3.5 text-[var(--a-muted)]" aria-hidden="true" />
            </summary>

            <nav
              aria-label="Mobile navigation"
              className="absolute right-0 z-50 mt-2 w-56 rounded-2xl border border-[var(--a-rule)] bg-[var(--a-well)] p-2 shadow-[0_20px_50px_-16px_rgba(42,47,69,0.28)] flex flex-col"
            >
              {JUMP_SECTIONS.map((sec) => (
                <Link
                  key={sec.id}
                  href={isHome ? `#${sec.id}` : `/#${sec.id}`}
                  onClick={closeMobileMenu}
                  className="flex min-h-[44px] items-center justify-between rounded-xl px-3 text-[14px] font-medium text-[var(--a-ink)] no-underline hover:bg-[var(--a-surface)]"
                >
                  <span>{sec.label}</span>
                  <span aria-hidden="true" className="text-[12px] text-[var(--a-muted)]">↓</span>
                </Link>
              ))}
              <Link
                href="/colophon"
                scroll
                onClick={() => {
                  closeMobileMenu();
                  scrollTopInstant();
                }}
                className="flex min-h-[44px] items-center rounded-xl px-3 text-[14px] font-medium text-[var(--a-ink)] no-underline hover:bg-[var(--a-surface)]"
              >
                Colophon
              </Link>
              {isLoggedIn ? (
                <Link
                  href="/app"
                  onClick={closeMobileMenu}
                  className="mt-1 border-t border-[var(--a-rule)] flex min-h-[44px] items-center justify-between rounded-xl px-3 text-[14px] font-semibold text-[var(--a-accent-text)] no-underline hover:bg-[var(--a-surface)]"
                >
                  <span>Go to App</span>
                  <span aria-hidden="true">→</span>
                </Link>
              ) : (
                <Link
                  href={loginHref}
                  onClick={closeMobileMenu}
                  className="mt-1 border-t border-[var(--a-rule)] flex min-h-[44px] items-center rounded-xl px-3 text-[14px] font-semibold text-[var(--a-accent-text)] no-underline hover:bg-[var(--a-surface)]"
                >
                  Log in
                </Link>
              )}
            </nav>
          </details>

          {isLoggedIn ? (
            <Link
              href="/app"
              {...bloomHandlers<HTMLAnchorElement>()}
              className="wc-cta inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[var(--a-accent-fill)] px-4 sm:px-5 text-sm sm:text-[15px] font-semibold text-white no-underline whitespace-nowrap shadow-[0_12px_30px_-14px_rgba(254,41,158,0.65)]"
            >
              <span>Go to App</span>
              <span aria-hidden="true">→</span>
            </Link>
          ) : (
            <>
              <Link
                href={loginHref}
                className="wc-link hidden md:inline-flex min-h-[44px] items-center px-1 text-[15px] font-medium text-[var(--a-ink)]"
              >
                Log in
              </Link>
              <Link
                href="/login?intent=signup"
                {...bloomHandlers<HTMLAnchorElement>()}
                className="wc-cta inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[var(--a-ink)] px-4 sm:px-5 text-sm sm:text-[15px] font-semibold text-[var(--a-bg)] no-underline whitespace-nowrap"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
