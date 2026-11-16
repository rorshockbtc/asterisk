'use client';

import React, { useId, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import HorizonTabs from '@/components/compose/HorizonTabs';
import MediaTray from '@/components/compose/MediaTray';
import WeatherBand from '@/components/compose/WeatherBand';
import PostPreview from '@/components/compose/PostPreview';
import ReplyLinkBox from '@/components/compose/ReplyLinkBox';
import { useEnvelopeFlight } from '@/components/compose/EnvelopeFlight';
import { bloomHandlers } from '@/art/bloom';
import {
  adaptSeedToPlatform,
  analyzeDraftForPlatform,
  countWords,
  extractLinksForThreadsReply,
  PLATFORM_GUIDES,
  PLATFORM_SPECS,
  type MediaAttachment,
  type PlatformId,
} from '@/lib/platforms';

const SAMPLE_SEED =
  'Spent the weekend replacing every card in our app with plain typography and a little watercolor.\n\nIt is calmer, faster, and people finally read the words. What would you cut first?\n\nhttps://asterisk.pipes.pink';

/**
 * Public, account-free demo. Everything stays in this browser tab; nothing is sent anywhere.
 * Copy & Open + up-to-4 image testing work immediately; direct publishing requires signing in.
 */
export default function PublicDemo() {
  const tabsId = useId();
  const [seed, setSeed] = useState(SAMPLE_SEED);
  const [media, setMedia] = useState('');
  const [attachments, setAttachments] = useState<MediaAttachment[]>([]);
  const [active, setActive] = useState<PlatformId>('threads');
  const [overrides, setOverrides] = useState<Partial<Record<PlatformId, { body: string; reply: string }>>>({});
  const [status, setStatus] = useState('');
  const copyRef = useRef<HTMLButtonElement>(null);
  const { launch, layer } = useEnvelopeFlight();

  const adapted = useMemo(() => adaptSeedToPlatform(active, seed), [active, seed]);
  const draft = overrides[active] ?? { body: adapted.bodyText, reply: adapted.replyText };
  const analysis = useMemo(
    () => analyzeDraftForPlatform(active, draft.body, draft.reply, media, attachments),
    [active, draft.body, draft.reply, media, attachments]
  );
  const spec = PLATFORM_SPECS[active];

  const charCount = draft.body.length;
  const wordCount = countWords(draft.body);
  const overHardLimit = active !== 'x' && charCount > spec.charLimit;
  const inSweetSpot = charCount >= spec.sweetSpotMin && charCount <= spec.sweetSpotMax;
  const meterPct = Math.min(100, Math.round((charCount / spec.charLimit) * 100));

  function editBody(body: string) {
    setOverrides((o) => ({ ...o, [active]: { body, reply: draft.reply } }));
  }

  function editReply(reply: string) {
    setOverrides((o) => ({ ...o, [active]: { body: draft.body, reply } }));
  }

  function fix() {
    const { mainText, replyText } = extractLinksForThreadsReply(draft.body);
    setOverrides((o) => ({ ...o, [active]: { body: mainText, reply: replyText || draft.reply } }));
  }

  async function copyAndOpen() {
    if (!draft.body.trim()) return;
    try {
      await navigator.clipboard.writeText(draft.body.trim());
      launch(copyRef.current);
      window.open(spec.composeUrl, '_blank', 'noopener,noreferrer');
      setStatus(
        draft.reply.trim()
          ? `Copied for ${spec.shortName}. After posting, click "Copy ${active === 'threads' ? 'self-reply' : 'first comment'} link" above and paste it under your post.`
          : `Copied for ${spec.shortName}. Paste it into the composer that just opened.`
      );
    } catch {
      setStatus('Your browser blocked clipboard access. Select the text and copy it manually.');
    }
  }

  return (
    <section id="demo" aria-labelledby="demo-title" className="relative scroll-mt-20 bg-[var(--a-bg)] py-24 sm:py-36">
      {layer}
      <div className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12">
        <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <p className="font-sans text-[13px] font-semibold uppercase tracking-[0.16em] text-[var(--a-muted)]">
              Try it · no account
            </p>
            <h2 id="demo-title" className="mt-3 font-display text-big font-bold text-[var(--a-ink)]">
              Write once. <span className="font-serif italic font-normal">Watch it travel.</span>
            </h2>
          </div>
          <p className="lg:col-span-4 text-[15px] leading-relaxed text-[var(--a-muted)]">
            Everything stays in this tab. Copy &amp; Open works for every room; publishing straight to Threads and X
            just needs a free account.
          </p>
        </div>

        <div className="mt-12 grid gap-10 lg:grid-cols-12 lg:gap-14">
          {/* Write */}
          <div className="lg:col-span-5 space-y-5">
            <label htmlFor="demo-seed" className="block font-display text-xl font-bold text-[var(--a-ink)]">
              Your thought
            </label>
            <textarea
              id="demo-seed"
              value={seed}
              onChange={(e) => {
                setSeed(e.target.value);
                setOverrides({});
              }}
              className="asterisk-textarea block border-0 border-b-2 border-[var(--a-ink)]/15 bg-transparent px-0 py-2 font-serif text-[22px] leading-[1.5] text-[var(--a-ink)] focus:border-[var(--a-accent)] focus:outline-none focus-visible:outline-none transition-colors"
            />
            <MediaTray
              attachments={attachments}
              onChangeAttachments={setAttachments}
              mediaNote={media}
              onChangeMediaNote={setMedia}
            />
          </div>

          {/* Read */}
          <div className="lg:col-span-7 min-w-0 space-y-6">
            <HorizonTabs active={active} onSelect={setActive} idBase={tabsId} label="Demo channels" />

            <div role="tabpanel" aria-labelledby={`${tabsId}-tab-${active}`} className="space-y-6">
              <div className="space-y-2">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <p className="font-serif italic text-lg text-[var(--a-muted)] max-w-[46ch]">
                    {PLATFORM_GUIDES[active].audiencePortrait}
                  </p>
                  <span className="font-sans text-[13px] tabular-nums whitespace-nowrap">
                    <span
                      className={
                        overHardLimit
                          ? 'font-semibold text-[var(--a-accent-text)]'
                          : inSweetSpot
                            ? 'font-semibold text-[var(--a-emerald)]'
                            : 'font-semibold text-[var(--a-ink)]'
                      }
                    >
                      {charCount}
                    </span>
                    <span className="text-[var(--a-muted)]">
                      {' '}
                      / {spec.charLimit} chars · {wordCount} {wordCount === 1 ? 'word' : 'words'} · sweet spot {spec.sweetSpotMin}–{spec.sweetSpotMax}
                    </span>
                  </span>
                </div>
                <div className="h-[3px] w-full overflow-hidden rounded-full bg-[var(--a-rule)]" aria-hidden="true">
                  <div
                    className={`h-full transition-[width,background-color] duration-200 ${
                      overHardLimit
                        ? 'bg-[var(--a-accent)]'
                        : inSweetSpot
                          ? 'bg-[var(--a-emerald)]'
                          : 'bg-[var(--a-ink)]/45'
                    }`}
                    style={{ width: `${meterPct}%` }}
                  />
                </div>
              </div>

              <div className="relative bg-[var(--a-well)] px-5 py-6 sm:px-7 sm:py-7 shadow-[0_1px_0_rgba(17,24,39,0.06),0_30px_60px_-40px_rgba(42,47,69,0.35)] space-y-5">
                <PostPreview
                  platform={active}
                  body={draft.body}
                  reply={draft.reply}
                  attachments={attachments}
                />

                <details className="border-t border-[var(--a-rule)] pt-3 group">
                  <summary className="min-h-[40px] inline-flex flex-wrap items-center gap-2 cursor-pointer text-[14px] font-semibold text-[var(--a-ink)] hover:text-[var(--a-accent-text)]">
                    <span>Customize {spec.shortName} wording</span>
                    <span className="font-normal text-[13px] text-[var(--a-muted)]">
                      — optional override just for this room
                    </span>
                  </summary>
                  <p className="mt-1.5 text-[13px] text-[var(--a-muted)]">
                    Changes here affect only {spec.name}; your other rooms stay synced to your thought on the left.
                  </p>
                  <textarea
                    aria-label={`${spec.name} copy`}
                    value={draft.body}
                    onChange={(e) => editBody(e.target.value)}
                    className="asterisk-textarea-compact mt-2 block rounded-md border border-[var(--a-rule)] bg-[var(--a-bg)] px-3.5 py-2.5 text-[16px] leading-relaxed text-[var(--a-ink)]"
                  />
                </details>

                <ReplyLinkBox
                  platform={active}
                  bodyText={draft.body}
                  replyText={draft.reply}
                  onChangeReply={editReply}
                  onExtractFromBody={fix}
                  onCopyReply={() => {
                    if (!draft.reply.trim()) return;
                    navigator.clipboard.writeText(draft.reply.trim());
                    setStatus(
                      `Copied ${spec.shortName} ${active === 'threads' ? 'self-reply' : 'first comment'} link.`
                    );
                  }}
                />
              </div>

              <WeatherBand analysis={analysis} onFix={fix} />

              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-2">
                <button
                  ref={copyRef}
                  type="button"
                  onClick={copyAndOpen}
                  {...bloomHandlers<HTMLButtonElement>()}
                  className="wc-cta inline-flex min-h-[52px] items-center gap-2 rounded-full bg-[var(--a-accent-fill)] px-7 text-base font-semibold text-white cursor-pointer shadow-[0_14px_36px_-14px_rgba(254,41,158,0.7)]"
                >
                  Copy &amp; open {spec.shortName} <span aria-hidden="true">↗</span>
                </button>
                <Link href="/login?intent=signup" className="wc-link min-h-[44px] inline-flex items-center text-[15px] font-semibold text-[var(--a-ink)]">
                  Sign up to publish directly
                </Link>
              </div>
              <p role="status" aria-live="polite" className="min-h-[1.5em] text-[15px] text-[var(--a-ink)]/80">
                {status}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
