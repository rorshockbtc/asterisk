'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown, Send } from 'lucide-react';
import HorizonTabs from '@/components/compose/HorizonTabs';
import MediaTray from '@/components/compose/MediaTray';
import PostPreview from '@/components/compose/PostPreview';
import ReplyLinkBox from '@/components/compose/ReplyLinkBox';
import WeatherBand from '@/components/compose/WeatherBand';
import { useEnvelopeFlight } from '@/components/compose/EnvelopeFlight';
import { useStudio } from '@/components/studio/StudioContext';
import TopicPicker from '@/components/studio/TopicPicker';
import { bloomHandlers } from '@/art/bloom';
import {
  analyzeDraftForPlatform,
  countWords,
  PLATFORM_GUIDES,
  PLATFORM_ORDER,
  PLATFORM_SPECS,
  type PlatformId,
} from '@/lib/platforms';

export default function CalmStudio() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ctaRef = useRef<HTMLButtonElement>(null);
  const pipeDetailsRef = useRef<HTMLDetailsElement>(null);
  const handledQueryRef = useRef<string>('');
  const { launch, layer } = useEnvelopeFlight();

  const {
    activePlatform,
    setActivePlatform,
    title,
    setTitle,
    brand,
    setBrand,
    seedText,
    updateSeedText,
    mediaNote,
    setMediaNote,
    attachments,
    setAttachments,
    variants,
    customized,
    updateVariantBody,
    updateVariantReply,
    resetPlatformToSeed,
    inboundSource,
    applyInboundFromPipes,
    platformSettings,
    pipesSession,
    apiStatus,
    isSaving,
    isPublishing,
    isPublishingPipe,
    handleSaveDraft,
    handlePublishToPersonalPipe,
    handleMoveLinksToReply,
    handleCopyReplyOnly,
    handleCopyAndLog,
    handleAutoPublish,
  } = useStudio();

  const [extensionNote, setExtensionNote] = useState('');
  const [pendingInbound, setPendingInbound] = useState<{
    draft?: string;
    sourceTitle?: string;
    sourceUrl?: string;
    pipe?: string;
  } | null>(null);

  // Inbound deep-link hydration from pipes.pink ("Post to Social *")
  const draftParam = searchParams.get('draft') || '';
  const sourceTitleParam = searchParams.get('sourceTitle') || '';
  const sourceUrlParam = searchParams.get('sourceUrl') || '';
  const pipeParam = searchParams.get('pipe') || '';
  const inboundKey = `${draftParam}|${sourceTitleParam}|${sourceUrlParam}|${pipeParam}`;

  useEffect(() => {
    if (!draftParam && !sourceUrlParam) return;
    if (handledQueryRef.current === inboundKey) return;
    handledQueryRef.current = inboundKey;

    const payload = {
      draft: draftParam,
      sourceTitle: sourceTitleParam,
      sourceUrl: sourceUrlParam,
      pipe: pipeParam,
    };

    const rafId = requestAnimationFrame(() => {
      if (!seedText.trim()) {
        applyInboundFromPipes(payload);
      } else {
        setPendingInbound(payload);
      }
    });
    return () => cancelAnimationFrame(rafId);
  }, [applyInboundFromPipes, draftParam, inboundKey, pipeParam, seedText, sourceTitleParam, sourceUrlParam]);

  // Outside click / Escape listener for Personal Pipe popover
  useEffect(() => {
    const details = pipeDetailsRef.current;
    if (!details) return;
    const onDown = (e: PointerEvent) => {
      if (details.open && !details.contains(e.target as Node)) {
        details.open = false;
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (details.open && e.key === 'Escape') {
        details.open = false;
      }
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const roomParam = searchParams.get('room') as PlatformId | null;
  const effectivePlatform: PlatformId =
    roomParam && PLATFORM_ORDER.includes(roomParam) ? roomParam : activePlatform;

  function handleSelectPlatform(pid: PlatformId) {
    setActivePlatform(pid);
    if (roomParam) {
      router.replace(`/app?room=${pid}`, { scroll: false });
    }
  }

  const activeSpec = PLATFORM_SPECS[effectivePlatform];
  const activeGuide = PLATFORM_GUIDES[effectivePlatform];
  const activeVariant = variants[effectivePlatform];
  const activeApi = apiStatus?.[effectivePlatform];
  const activeHandle =
    platformSettings.find((s) => s.platform === effectivePlatform)?.handle ||
    (pipesSession?.user?.handle ? `@${pipesSession.user.handle}` : '');

  const analysis = useMemo(
    () =>
      analyzeDraftForPlatform(
        effectivePlatform,
        activeVariant.body_text,
        activeVariant.reply_text,
        mediaNote,
        attachments
      ),
    [effectivePlatform, activeVariant.body_text, activeVariant.reply_text, mediaNote, attachments]
  );

  const postedMap = useMemo(() => {
    const map: Partial<Record<PlatformId, boolean>> = {};
    for (const pid of PLATFORM_ORDER) {
      if (variants[pid]?.published_at) map[pid] = true;
    }
    return map;
  }, [variants]);

  const charCount = activeVariant.body_text.length;
  const wordCount = countWords(activeVariant.body_text);
  const overHardLimit = effectivePlatform !== 'x' && charCount > activeSpec.charLimit;
  const inSweetSpot =
    charCount >= activeSpec.sweetSpotMin && charCount <= activeSpec.sweetSpotMax;
  const meterPct = Math.min(100, Math.round((charCount / activeSpec.charLimit) * 100));

  async function onPrimaryPublish() {
    if (activeApi?.configured) {
      const ok = await handleAutoPublish(effectivePlatform);
      if (ok) launch(ctaRef.current);
      return;
    }
    const ok = await handleCopyAndLog(effectivePlatform, true);
    if (ok) launch(ctaRef.current);
  }

  async function onPublishPersonalPipe() {
    const ok = await handlePublishToPersonalPipe(extensionNote);
    if (ok) {
      if (pipeDetailsRef.current) pipeDetailsRef.current.open = false;
      setExtensionNote('');
      launch(ctaRef.current);
    }
  }

  const personalPipeLabel = pipesSession?.user?.personalPipe
    ? `pipe\\${pipesSession.user.personalPipe}`
    : 'Personal Pipe';

  return (
    <div className="mx-auto w-full max-w-[54rem] px-4 sm:px-8 py-5 sm:py-7 space-y-6">
      {layer}

      {pendingInbound && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 border-l-2 border-[var(--a-accent)] bg-[var(--a-surface)] px-4 py-2.5 text-[14px]"
        >
          <span>
            Loaded link from{' '}
            <strong>
              {pendingInbound.pipe ? `pipe\\${pendingInbound.pipe}` : 'Pipes'}
            </strong>
            . Replace current unsaved sheet?
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                applyInboundFromPipes(pendingInbound);
                setPendingInbound(null);
              }}
              className="wc-link font-semibold text-[var(--a-accent-text)] cursor-pointer"
            >
              Load draft
            </button>
            <button
              type="button"
              onClick={() => setPendingInbound(null)}
              className="text-[13px] text-[var(--a-muted)] hover:text-[var(--a-ink)] cursor-pointer"
            >
              Keep current
            </button>
          </div>
        </div>
      )}

      {/* Section A: Compact single-sheet writing area calibrated for desktop + mobile */}
      <section aria-label="Core thought" className="relative group space-y-3.5">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-6 -z-10 opacity-0 transition-opacity duration-500 group-focus-within:opacity-100"
          style={{
            background:
              'radial-gradient(65% 65% at 22% 45%, rgba(247,185,201,0.22), rgba(250,214,184,0.14) 55%, transparent 78%)',
            filter: 'url(#wc-bleed)',
          }}
        />

        {(inboundSource?.pipe || inboundSource?.sourceUrl) && (
          <p className="font-sans text-[13px] font-medium text-[var(--a-muted)] flex flex-wrap items-center gap-2">
            <span className="text-[var(--a-accent)]">*</span>
            <span>
              Adapting from{' '}
              <strong className="text-[var(--a-ink)]">
                {inboundSource.pipe ? `pipe\\${inboundSource.pipe}` : 'Pipes'}
              </strong>
            </span>
            {inboundSource.sourceUrl && (
              <a
                href={inboundSource.sourceUrl}
                target="_blank"
                rel="noopener"
                className="wc-link text-[var(--a-accent-text)]"
              >
                View source ↗
              </a>
            )}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="studio-title" className="sr-only">
              Note title
            </label>
            <input
              id="studio-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give this thought a quiet title…"
              className="w-full min-h-[40px] border-0 bg-transparent px-0 font-display text-xl sm:text-2xl font-bold tracking-[-0.03em] text-[var(--a-ink)] placeholder:text-[var(--a-muted)]/55 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            <TopicPicker value={brand} onChange={setBrand} label="Topic" />

            <details ref={pipeDetailsRef} className="relative">
              <summary className="list-none inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-[var(--a-rule)] bg-[var(--a-well)] px-3.5 text-[13px] font-semibold text-[var(--a-ink)] hover:border-[var(--a-accent)] cursor-pointer select-none whitespace-nowrap">
                <span>{personalPipeLabel}</span>
                <ChevronDown className="h-3.5 w-3.5 text-[var(--a-accent-text)]" aria-hidden="true" />
              </summary>

              <div className="absolute right-0 z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-[var(--a-rule)] bg-[var(--a-well)] p-4 shadow-[0_20px_50px_-16px_rgba(42,47,69,0.28)] space-y-3">
                <div className="space-y-1">
                  <p className="text-[14px] font-semibold text-[var(--a-ink)]">
                    Publish to {personalPipeLabel}
                  </p>
                  <p className="text-[13px] text-[var(--a-muted)] leading-snug">
                    Saves this note in Hash and publishes it directly into your public Personal Pipe.
                  </p>
                </div>

                <div>
                  <label htmlFor="personal-pipe-note" className="sr-only">
                    Optional note for Personal Pipe
                  </label>
                  <input
                    id="personal-pipe-note"
                    type="text"
                    value={extensionNote}
                    onChange={(e) => setExtensionNote(e.target.value)}
                    placeholder="Optional reflection appended below note…"
                    className="w-full min-h-[38px] rounded-lg border border-[var(--a-rule)] bg-[var(--a-bg)] px-3 text-[14px] text-[var(--a-ink)] placeholder:text-[var(--a-muted)]/60 focus:border-[var(--a-accent)] focus:outline-none"
                  />
                </div>

                <button
                  type="button"
                  disabled={isPublishingPipe}
                  onClick={onPublishPersonalPipe}
                  className="inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-full bg-[var(--a-accent-fill)] px-4 text-[14px] font-semibold text-white hover:bg-[var(--a-ink)] transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{isPublishingPipe ? 'Publishing…' : `Publish to ${personalPipeLabel}`}</span>
                </button>
              </div>
            </details>

            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleSaveDraft()}
              className="wc-link min-h-[40px] px-1 text-[14px] font-semibold text-[var(--a-ink)] cursor-pointer disabled:opacity-50 whitespace-nowrap"
            >
              {isSaving ? (
                'Saving…'
              ) : (
                <>
                  Save to <span className="text-[var(--a-accent)]">#</span> Hash
                </>
              )}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="studio-seed" className="sr-only">
            Your thought
          </label>
          <textarea
            id="studio-seed"
            value={seedText}
            onChange={(e) => updateSeedText(e.target.value)}
            placeholder="Write once in your own words — drop a link and asterisk keeps every room link-safe…"
            className="asterisk-textarea-compact block border-0 border-b-2 border-[var(--a-ink)]/15 bg-transparent px-0 py-1.5 font-serif text-[18px] sm:text-[20px] leading-[1.48] text-[var(--a-ink)] placeholder:text-[var(--a-muted)]/55 focus:border-[var(--a-accent)] focus:outline-none transition-colors"
          />
        </div>

        <MediaTray
          attachments={attachments}
          onChangeAttachments={setAttachments}
          mediaNote={mediaNote}
          onChangeMediaNote={setMediaNote}
          compact
        />
      </section>

      {/* Section B: Six Birds on the Horizon */}
      <section aria-label="Channel selection" className="min-w-0 space-y-4">
        <HorizonTabs
          active={effectivePlatform}
          onSelect={handleSelectPlatform}
          posted={postedMap}
          label="Channels"
        />

        {/* Section C: Active Room Sheet, Weather & Single Primary CTA */}
        <div role="tabpanel" className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
              <p className="font-serif italic text-base sm:text-lg text-[var(--a-muted)] max-w-[50ch]">
                {activeGuide.audiencePortrait}
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
                  / {activeSpec.charLimit} chars · {wordCount} {wordCount === 1 ? 'word' : 'words'} · sweet spot {activeSpec.sweetSpotMin}–{activeSpec.sweetSpotMax}
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

          {/* Typographic paper sheet */}
          <div className="bg-[var(--a-well)] px-5 py-4 sm:px-6 sm:py-5 shadow-[0_1px_0_rgba(17,24,39,0.06),0_30px_60px_-40px_rgba(42,47,69,0.35)] space-y-4">
            <PostPreview
              platform={effectivePlatform}
              body={activeVariant.body_text}
              reply={activeVariant.reply_text}
              handle={activeHandle}
              attachments={attachments}
            />

            <details className="border-t border-[var(--a-rule)] pt-2.5">
              <summary className="min-h-[40px] inline-flex flex-wrap items-center gap-x-2.5 gap-y-1 cursor-pointer text-[14px] font-semibold text-[var(--a-ink)] hover:text-[var(--a-accent-text)]">
                <span>Customize {activeSpec.shortName} wording</span>
                <span className="font-normal text-[13px] text-[var(--a-muted)]">
                  {customized[effectivePlatform]
                    ? '· custom override active'
                    : '— optional override without changing your thought above'}
                </span>
              </summary>

              <div className="mt-2.5 space-y-2.5">
                <p className="text-[13px] text-[var(--a-muted)] leading-snug">
                  Edits here apply only to {activeSpec.name}. Your other five rooms stay automatically synced to your main thought above.
                </p>
                <textarea
                  aria-label={`${activeSpec.name} post copy`}
                  value={activeVariant.body_text}
                  onChange={(e) => updateVariantBody(effectivePlatform, e.target.value)}
                  placeholder={`Write or adjust your ${activeSpec.name} post…`}
                  className="asterisk-textarea-compact block rounded-md border border-[var(--a-rule)] bg-[var(--a-bg)] px-4 py-2.5 text-[16px] leading-relaxed text-[var(--a-ink)]"
                />

                {customized[effectivePlatform] && (
                  <button
                    type="button"
                    onClick={() => resetPlatformToSeed(effectivePlatform)}
                    className="wc-link min-h-[38px] text-[13px] font-medium text-[var(--a-muted)] hover:text-[var(--a-ink)] cursor-pointer"
                  >
                    Sync back to core thought
                  </button>
                )}
              </div>
            </details>

            <ReplyLinkBox
              platform={effectivePlatform}
              bodyText={activeVariant.body_text}
              replyText={activeVariant.reply_text}
              onChangeReply={(next) => updateVariantReply(effectivePlatform, next)}
              onExtractFromBody={() => handleMoveLinksToReply(effectivePlatform)}
              onCopyReply={() => handleCopyReplyOnly(effectivePlatform)}
              autoPublishEnabled={Boolean(activeApi?.configured)}
            />

            {effectivePlatform === 'tiktok' && (
              <div className="border-l-2 border-[var(--a-sky)] bg-[var(--a-sky-surface)] px-4 py-3 text-[14px] text-[var(--a-sky-ink)]">
                <span className="font-sans text-[13px] font-semibold uppercase tracking-[0.12em] block mb-1">
                  Preliminary Test Mode
                </span>
                Keep 16:9 desktop recordings on X, Threads, Facebook, and Substack today; use this
                room for short (&lt;150-char) hooks until 9:16 vertical clips are ready.
              </div>
            )}
          </div>

          {/* Weather Band (glanced readiness + collapsible passes) */}
          <WeatherBand
            analysis={analysis}
            onFix={() => handleMoveLinksToReply(effectivePlatform)}
          />

          {/* Single Primary CTA Footer */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <button
                ref={ctaRef}
                type="button"
                disabled={isPublishing}
                onClick={onPrimaryPublish}
                {...bloomHandlers<HTMLButtonElement>()}
                className="wc-cta inline-flex min-h-[48px] items-center gap-2 rounded-full bg-[var(--a-accent-fill)] px-7 text-base font-semibold text-white shadow-[0_14px_36px_-14px_rgba(254,41,158,0.7)] disabled:opacity-50 cursor-pointer"
              >
                {activeApi?.configured ? (
                  <span>
                    {isPublishing ? 'Sending…' : `Publish to ${activeSpec.shortName} →`}
                  </span>
                ) : (
                  <span>Copy &amp; open {activeSpec.shortName} ↗</span>
                )}
              </button>

              {activeApi?.configured ? (
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await handleCopyAndLog(effectivePlatform, true);
                    if (ok) launch(ctaRef.current);
                  }}
                  className="wc-link min-h-[40px] text-[15px] font-medium text-[var(--a-ink)] cursor-pointer"
                >
                  or copy &amp; open composer ↗
                </button>
              ) : (
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await handleCopyAndLog(effectivePlatform, false);
                    if (ok) launch(ctaRef.current);
                  }}
                  className="wc-link min-h-[40px] text-[15px] font-medium text-[var(--a-muted)] hover:text-[var(--a-ink)] cursor-pointer"
                >
                  Copy &amp; log without opening
                </button>
              )}
            </div>

            <span className="font-sans text-[13px] text-[var(--a-muted)]">
              {activeApi?.note || 'Copy-ready'}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
