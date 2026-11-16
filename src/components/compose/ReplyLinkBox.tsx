'use client';

import React, { useId, useState } from 'react';
import { Check, Copy, HelpCircle } from 'lucide-react';
import { AccentInput } from 'accent-ui/ui';
import type { PlatformId } from '@/lib/platforms';

/**
 * Shared self-reply / first-comment link bar + educational info box for Threads & Facebook.
 * Explains why outbound URLs leave the main body and makes 2-step manual copying effortless.
 */
export default function ReplyLinkBox({
  platform,
  bodyText,
  replyText,
  onChangeReply,
  onExtractFromBody,
  onCopyReply,
  autoPublishEnabled = false,
}: {
  platform: PlatformId;
  bodyText: string;
  replyText: string;
  onChangeReply: (next: string) => void;
  onExtractFromBody: () => void;
  onCopyReply?: () => Promise<void> | void;
  autoPublishEnabled?: boolean;
}) {
  const inputId = useId();
  const [copiedReply, setCopiedReply] = useState(false);

  if (platform !== 'threads' && platform !== 'facebook') {
    return null;
  }

  const isThreads = platform === 'threads';
  const title = isThreads ? 'Threads self-reply link' : 'Facebook first-comment link';
  const replyNoun = isThreads ? 'self-reply' : 'first comment';
  const roomName = isThreads ? 'Threads' : 'Facebook';
  const hasUrlInBody = /https?:\/\/[^\s]+/i.test(bodyText);

  async function handleCopy() {
    const clean = replyText.trim();
    if (!clean) return;
    if (onCopyReply) {
      await onCopyReply();
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(clean);
    }
    setCopiedReply(true);
    setTimeout(() => setCopiedReply(false), 2000);
  }

  return (
    <div className="border-l-2 border-[var(--a-accent)] pl-4 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <label
            htmlFor={inputId}
            className="font-sans text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--a-ink)]"
          >
            {title}
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {hasUrlInBody && (
            <button
              type="button"
              onClick={onExtractFromBody}
              className="wc-link min-h-[38px] text-[13px] font-semibold text-[var(--a-accent-text)] cursor-pointer"
            >
              Move URL out of post
            </button>
          )}
          {!hasUrlInBody && (
            <button
              type="button"
              onClick={onExtractFromBody}
              className="wc-link min-h-[38px] text-[13px] font-medium text-[var(--a-muted)] hover:text-[var(--a-ink)] cursor-pointer"
            >
              Check post for URL
            </button>
          )}
          {replyText.trim() && (
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-[var(--a-rule)] bg-[var(--a-bg)] px-3 text-[13px] font-semibold text-[var(--a-ink)] hover:border-[var(--a-accent)] cursor-pointer transition-colors"
            >
              {copiedReply ? (
                <>
                  <Check className="h-3.5 w-3.5 text-[var(--a-emerald)]" aria-hidden="true" />
                  <span>Copied link</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-[var(--a-accent-text)]" aria-hidden="true" />
                  <span>Copy {replyNoun} link</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <AccentInput
        id={inputId}
        type="text"
        value={replyText}
        onChange={(e) => onChangeReply(e.target.value)}
        placeholder={`Optional ${replyNoun} URL (auto-filled when you include a link above)`}
      />

      <details className="group">
        <summary className="inline-flex min-h-[36px] items-center gap-1.5 cursor-pointer text-[13px] font-medium text-[var(--a-muted)] hover:text-[var(--a-ink)]">
          <HelpCircle className="h-3.5 w-3.5 text-[var(--a-accent-text)]" aria-hidden="true" />
          <span>Why use a {replyNoun}? How it works</span>
        </summary>
        <div className="mt-2 rounded-xl bg-[var(--a-surface)] px-4 py-3 text-[14px] leading-relaxed text-[var(--a-ink)]/85 space-y-1.5">
          <p>
            <strong>Why:</strong> {roomName} quietly down-ranks main posts that include external links
            sending people away from the feed. Keeping the main post link-free and dropping your
            URL as the immediate {replyNoun} protects reach.
          </p>
          <p>
            <strong>How to post it:</strong>{' '}
            {autoPublishEnabled && isThreads ? (
              <>
                With Threads direct publishing connected, clicking <strong>Publish to Threads</strong>{' '}
                posts your main thought and attaches this self-reply automatically.
              </>
            ) : (
              <>
                <strong>1.</strong> Click <strong>Copy &amp; open {roomName}</strong> below and paste
                your main post. <strong>2.</strong> Click <strong>Copy {replyNoun} link</strong>{' '}
                above and paste it as the first {isThreads ? 'reply' : 'comment'} right under your post.
              </>
            )}
          </p>
        </div>
      </details>
    </div>
  );
}
