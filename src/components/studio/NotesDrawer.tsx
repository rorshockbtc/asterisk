'use client';

import React, { useEffect, useId, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Trash2, X } from 'lucide-react';
import { AccentHairlineItem, AccentHairlineList, AccentIconButton } from 'accent-ui/ui';
import { useStudio } from '@/components/studio/StudioContext';
import { PLATFORM_SPECS } from '@/lib/platforms';
import { PIPES_DESK_URL, PIPES_HASH_URL } from '@/lib/session';

/**
 * Native modal `<dialog>` drawer for saved drafts synced with Hash (#).
 * Uses `closedby="any"` plus coordinate backdrop fallback for Safari.
 */
export default function NotesDrawer() {
  const headingId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  const {
    broadcasts,
    selectedId,
    drawerOpen,
    setDrawerOpen,
    handleHydrateBroadcast,
    handleDeleteBroadcast,
  } = useStudio();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (drawerOpen && !dialog.open) {
      dialog.showModal();
    } else if (!drawerOpen && dialog.open) {
      dialog.close();
    }
  }, [drawerOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const onClose = () => setDrawerOpen(false);
    dialog.addEventListener('close', onClose);

    // Fallback light-dismiss for browsers without native `closedby="any"` (Safari).
    let removeFallback: (() => void) | undefined;
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      const onBackdropClick = (event: MouseEvent) => {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        const inside =
          rect.top <= event.clientY &&
          event.clientY <= rect.top + rect.height &&
          rect.left <= event.clientX &&
          event.clientX <= rect.left + rect.width;
        if (!inside) {
          dialog.close();
        }
      };
      dialog.addEventListener('click', onBackdropClick);
      removeFallback = () => dialog.removeEventListener('click', onBackdropClick);
    }

    return () => {
      dialog.removeEventListener('close', onClose);
      removeFallback?.();
    };
  }, [setDrawerOpen]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={headingId}
      {...({ closedby: 'any' } as Record<string, string>)}
      className="m-0 ml-auto h-dvh max-h-dvh w-full max-w-[440px] border-l border-[var(--a-rule)] bg-[var(--a-bg)] p-0 text-[var(--a-ink)] shadow-2xl open:flex open:flex-col"
    >
      <div className="flex items-center justify-between border-b border-[var(--a-rule)] px-6 py-4">
        <div className="space-y-0.5">
          <p className="font-sans text-[13px] font-semibold uppercase tracking-[0.14em] text-[var(--a-muted)]">
            <span className="text-[var(--a-accent)]">#</span> Hash
          </p>
          <h2 id={headingId} className="font-display text-xl font-bold text-[var(--a-ink)]">
            Saved in Hash ({broadcasts.length})
          </h2>
        </div>

        <AccentIconButton
          variant="ghost"
          aria-label="Close Hash drawer"
          onClick={() => dialogRef.current?.close()}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </AccentIconButton>
      </div>

      <div className="border-b border-[var(--a-rule)] bg-[var(--a-surface)]/55 px-6 py-3 space-y-2 text-[13px] leading-snug text-[var(--a-muted)]">
        <p>
          <strong className="text-[var(--a-ink)]">Hash</strong> is your private writing journal inside
          the Pipes ecosystem. Notes stay on your machine locally and sync into your Hash entries when
          signed in.
        </p>
        <div className="flex flex-wrap items-center gap-4 font-semibold">
          <a
            href={PIPES_HASH_URL}
            target="_blank"
            rel="noopener"
            className="wc-link text-[var(--a-accent-text)]"
          >
            Open # Hash ↗
          </a>
          <a
            href={PIPES_DESK_URL}
            target="_blank"
            rel="noopener"
            className="wc-link text-[var(--a-ink)]"
          >
            My Pipes Desk ↗
          </a>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        {broadcasts.length === 0 ? (
          <p className="font-serif italic text-lg text-[var(--a-muted)]">
            No thoughts saved in Hash yet. Write on the sheet and click Save to # Hash anytime.
          </p>
        ) : (
          <AccentHairlineList>
            {broadcasts.map((b, idx) => {
              const isCurrent = selectedId === b.id;
              const shipped = b.variants.filter((v) => v.published_at);
              return (
                <AccentHairlineItem key={b.id} index={idx + 1} className="py-4!">
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      autoFocus={idx === 0}
                      onClick={() => {
                        handleHydrateBroadcast(b);
                        dialogRef.current?.close();
                        if (pathname !== '/app') {
                          router.push('/app');
                        }
                      }}
                      className="min-h-[44px] flex-1 text-left cursor-pointer"
                    >
                      <div
                        className={`font-display text-base font-bold leading-snug ${
                          isCurrent ? 'text-[var(--a-accent-text)]' : 'text-[var(--a-ink)]'
                        }`}
                      >
                        {b.title}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-sans text-[13px] text-[var(--a-muted)]">
                        <span>{b.brand}</span>
                        {shipped.length > 0 && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-medium text-[var(--a-emerald)]">
                              {shipped
                                .map((v) => PLATFORM_SPECS[v.platform]?.shortName)
                                .join(', ')}
                            </span>
                          </>
                        )}
                      </div>
                    </button>

                    <AccentIconButton
                      variant="ghost"
                      aria-label={`Delete ${b.title}`}
                      onClick={() => handleDeleteBroadcast(b.id)}
                    >
                      <Trash2 className="h-4 w-4 text-[var(--a-muted)]" aria-hidden="true" />
                    </AccentIconButton>
                  </div>
                </AccentHairlineItem>
              );
            })}
          </AccentHairlineList>
        )}
      </div>
    </dialog>
  );
}
