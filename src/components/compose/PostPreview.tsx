'use client';

import React from 'react';
import {
  formatAspectBadge,
  PLATFORM_SPECS,
  splitIntoXThread,
  type MediaAttachment,
  type PlatformId,
} from '@/lib/platforms';

/**
 * Typographic preview of how the post will read in that room:
 * line breaks, X thread numbering, up to 4 attached images, and Threads/Facebook self-reply.
 */
export default function PostPreview({
  platform,
  body,
  reply,
  handle,
  attachments = [],
}: {
  platform: PlatformId;
  body: string;
  reply?: string;
  handle?: string;
  attachments?: MediaAttachment[];
}) {
  const spec = PLATFORM_SPECS[platform];
  const parts = platform === 'x' ? splitIntoXThread(body, 280) : body.trim() ? [body.trim()] : [];
  const who = handle?.trim() || 'you';

  if (parts.length === 0 && attachments.length === 0) {
    return (
      <p className="font-serif italic text-lg text-[var(--a-muted)]">
        Your {spec.name} post will appear here as it will read.
      </p>
    );
  }

  return (
    <div className="space-y-5" aria-label={`${spec.name} preview`}>
      {(parts.length > 0 ? parts : ['']).map((p, i) => (
        <article key={i} className="grid grid-cols-[2.25rem_1fr] gap-3">
          <span
            aria-hidden="true"
            className="mt-1 h-8 w-8 rounded-full bg-[radial-gradient(circle_at_35%_35%,#F7B9C9,#9C8FD0)]"
          />
          <div className="min-w-0 space-y-2.5">
            <p className="text-[14px] text-[var(--a-muted)]">
              <span className="font-semibold text-[var(--a-ink)]">{who}</span>
              {parts.length > 1 && (
                <span className="font-sans tabular-nums">
                  {' '}
                  · {i + 1}/{parts.length}
                </span>
              )}
            </p>
            {p && (
              <p className="whitespace-pre-wrap break-words text-[17px] leading-[1.55] text-[var(--a-ink)]">
                {p}
              </p>
            )}
            {i === 0 && attachments.length > 0 && (
              <div
                className={`grid gap-1.5 pt-1 ${
                  attachments.length === 1 ? 'grid-cols-1 max-w-sm' : 'grid-cols-2 max-w-md'
                }`}
              >
                {attachments.map((img) => (
                  <figure
                    key={img.id}
                    className="relative overflow-hidden rounded-lg border border-[var(--a-rule)] bg-[var(--a-surface)]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.url}
                      alt={img.name}
                      className={`block w-full object-cover ${
                        attachments.length === 1 ? 'max-h-56' : 'h-28'
                      }`}
                    />
                    <figcaption className="absolute bottom-1.5 right-1.5 rounded-full bg-[var(--a-ink)]/75 px-2 py-0.5 text-[11px] font-medium text-[var(--a-bg)]">
                      {formatAspectBadge(img.width, img.height)}
                    </figcaption>
                  </figure>
                ))}
              </div>
            )}
          </div>
        </article>
      ))}
      {reply?.trim() && (platform === 'threads' || platform === 'facebook') && (
        <article className="ml-5 grid grid-cols-[1.75rem_1fr] gap-3 border-l border-[var(--a-rule)] pl-4">
          <span
            aria-hidden="true"
            className="mt-1 h-6 w-6 rounded-full bg-[radial-gradient(circle_at_35%_35%,#F7B9C9,#9C8FD0)]"
          />
          <div className="min-w-0">
            <p className="text-[14px] text-[var(--a-muted)]">
              <span className="font-semibold text-[var(--a-ink)]">{who}</span> ·{' '}
              {platform === 'threads' ? 'self-reply' : 'first comment'}
            </p>
            <p className="mt-1 break-words text-[16px] text-[var(--a-ink)]">{reply.trim()}</p>
          </div>
        </article>
      )}
    </div>
  );
}
