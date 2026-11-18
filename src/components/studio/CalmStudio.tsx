'use client';

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { ChevronDown, ExternalLink, Send, Sparkles } from 'lucide-react';
import StudioPaperCanvas from '@/art/StudioPaperCanvas';
import HorizonTabs from '@/components/compose/HorizonTabs';
import MediaTray from '@/components/compose/MediaTray';
import PostPreview from '@/components/compose/PostPreview';
import ReplyLinkBox from '@/components/compose/ReplyLinkBox';
import WeatherBand from '@/components/compose/WeatherBand';
import { useEnvelopeFlight } from '@/components/compose/EnvelopeFlight';
import { useStudio } from '@/components/studio/StudioContext';
import TopicPicker from '@/components/studio/TopicPicker';
import { bloomHandlers } from '@/art/bloom';
import { ROOM_ART } from '@/lib/art-direction';
import { publishNostrNote } from '@/lib/nostr-client';
import {
  analyzeDraftForPlatform,
  countWords,
  PLATFORM_GUIDES,
  PLATFORM_ORDER,
  PLATFORM_SPECS,
  type PlatformId,
} from '@/lib/platforms';
import type { FlightReceiptItem } from '@/lib/studio-types';
import { readinessToWeather, WEATHER } from '@/lib/weather';

const STARTER_PROMPTS: Array<{ id: string; label: string; title: string; text: string }> = [
  {
    id: 'shipping',
    label: 'Shipping note',
    title: 'Weekend build log',
    text: 'Shipped a quieter composing flow today: plain typography on warm paper, live room weather, and zero algorithmic link clutter.\n\nWhat would you simplify next?\n\nhttps://asterisk.pipes.pink',
  },
  {
    id: 'thread',
    label: 'Short thread',
    title: 'Notes on writing once',
    text: 'Three habits that made cross-posting calmer:\n\n1. Write the honest version once on paper before formatting.\n\n2. Move external links into the Threads self-reply or Facebook first comment.\n\n3. Let each room keep its natural length.\n\nhttps://asterisk.pipes.pink',
  },
  {
    id: 'field',
    label: 'Field note',
    title: 'Quiet dispatch',
    text: 'One idea travels better when it wears the right clothes for each room — conversational on Threads, crisp lines on X, unhurried paragraphs in Substack.\n\nhttps://asterisk.pipes.pink',
  },
];

const DEFAULT_PROFILE_STORAGE_KEY = 'asterisk_default_profile_id';

export default function CalmStudio() {
  const tabsId = useId();
  const router = useRouter();
  const searchParams = useSearchParams();
  const reduce = useReducedMotion();
  const ctaRef = useRef<HTMLButtonElement>(null);
  const pipeDetailsRef = useRef<HTMLDetailsElement>(null);
  const handledQueryRef = useRef<string>('');
  const defaultProfileAppliedRef = useRef(false);
  const { launch, layer } = useEnvelopeFlight();

  const {
    broadcasts,
    activePlatform,
    setActivePlatform,
    setDrawerOpen,
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
    nostrStatus,
    flightReceipts,
    setFlightReceipts,
    setStatusMessage,
    setStatusLinks,
    isSaving,
    isPublishing,
    isPublishingPipe,
    handleSaveDraft,
    handlePublishToPersonalPipe,
    handleMoveLinksToReply,
    handleCopyReplyOnly,
    handleCopyAndLog,
    handleAutoPublish,
    handleAutoPublishMany,
  } = useStudio();

  const [selectedTargets, setSelectedTargets] = useState<PlatformId[]>([]);
  const [includeNostr, setIncludeNostr] = useState(false);
  const [inspectingNostr, setInspectingNostr] = useState(false);
  const [hasWindowNostr, setHasWindowNostr] = useState(false);
  const [profiles, setProfiles] = useState<Array<{ id: number; name: string; platforms: string[] }>>([]);
  const [nostrBusy, setNostrBusy] = useState(false);

  const [extensionNote, setExtensionNote] = useState('');
  const [pendingInbound, setPendingInbound] = useState<{
    draft?: string;
    sourceTitle?: string;
    sourceUrl?: string;
    pipe?: string;
  } | null>(null);

  useEffect(() => {
    const detected = typeof window !== 'undefined' && Boolean(window.nostr);
    setHasWindowNostr(detected);
  }, []);

  useEffect(() => {
    fetch('/api/profiles')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.profiles) setProfiles(d.profiles);
      })
      .catch(() => {});
  }, []);

  const connectedPlatforms = useMemo(
    () => PLATFORM_ORDER.filter((pid) => apiStatus?.[pid]?.configured),
    [apiStatus]
  );

  const showNostrTab = Boolean(nostrStatus?.connected || hasWindowNostr);

  // Pre-populate targets once from user's chosen default Audience Profile
  useEffect(() => {
    if (defaultProfileAppliedRef.current || profiles.length === 0 || !apiStatus) return;
    const savedId =
      typeof window !== 'undefined'
        ? Number(window.localStorage.getItem(DEFAULT_PROFILE_STORAGE_KEY) || 0)
        : 0;
    if (!savedId) return;
    const match = profiles.find((p) => p.id === savedId);
    if (!match) return;
    defaultProfileAppliedRef.current = true;
    setSelectedTargets(
      match.platforms.filter((p): p is PlatformId => Boolean(apiStatus[p as PlatformId]?.configured))
    );
    setIncludeNostr(match.platforms.includes('nostr') && showNostrTab);
  }, [apiStatus, profiles, showNostrTab]);

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
    setInspectingNostr(false);
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
    activeApi?.handle ||
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

  const weather = inspectingNostr ? 'clear' : readinessToWeather(analysis.readiness);
  const w = WEATHER[weather];
  const issues = analysis.checks.filter((c) => c.status !== 'pass');
  const urlFix = !inspectingNostr ? issues.find((c) => c.fixAction === 'move_url_to_reply') : undefined;

  const postedMap = useMemo(() => {
    const map: Partial<Record<PlatformId, boolean>> = {};
    for (const pid of PLATFORM_ORDER) {
      if (variants[pid]?.published_at) map[pid] = true;
    }
    return map;
  }, [variants]);

  const connectedMap = useMemo(() => {
    const map: Partial<Record<PlatformId, boolean>> = {};
    for (const pid of PLATFORM_ORDER) {
      if (apiStatus?.[pid]?.configured) map[pid] = true;
    }
    return map;
  }, [apiStatus]);

  const seedWords = countWords(seedText);
  const charCount = inspectingNostr ? seedText.length : activeVariant.body_text.length;
  const wordCount = inspectingNostr ? seedWords : countWords(activeVariant.body_text);
  const overHardLimit = !inspectingNostr && effectivePlatform !== 'x' && charCount > activeSpec.charLimit;
  const inSweetSpot =
    !inspectingNostr && charCount >= activeSpec.sweetSpotMin && charCount <= activeSpec.sweetSpotMax;
  const meterPct = inspectingNostr
    ? Math.min(100, Math.round((seedText.length / 500) * 100))
    : Math.min(100, Math.round((charCount / activeSpec.charLimit) * 100));

  const activeTargets = selectedTargets.filter((pid) => connectedPlatforms.includes(pid));
  const totalSelected = activeTargets.length + (includeNostr && showNostrTab ? 1 : 0);
  const hasAnyConnectedDestination = connectedPlatforms.length > 0 || showNostrTab;
  const roomVignette = ROOM_ART[effectivePlatform];

  async function publishNostrSingle(): Promise<FlightReceiptItem> {
    const text = seedText.trim();
    if (!text) {
      return {
        key: 'nostr',
        label: 'Nostr',
        ok: false,
        mode: 'nostr',
        detail: 'Write a thought before signing for Nostr.',
      };
    }
    setNostrBusy(true);
    try {
      const res = await publishNostrNote(text);
      return {
        key: 'nostr',
        label: 'Nostr',
        ok: res.ok,
        mode: 'nostr',
        detail: res.message,
      };
    } finally {
      setNostrBusy(false);
    }
  }

  async function onPrimaryPublish() {
    if (totalSelected > 0) {
      const batchReceipts = activeTargets.length > 0 ? await handleAutoPublishMany(activeTargets) : [];
      const nextReceipts = [...batchReceipts];
      if (includeNostr && showNostrTab) {
        const nReceipt = await publishNostrSingle();
        nextReceipts.push(nReceipt);
      }
      setFlightReceipts(nextReceipts);
      if (nextReceipts.some((r) => r.ok)) {
        launch(ctaRef.current);
      }
      if (nextReceipts.length > 0) {
        setStatusLinks(
          nextReceipts
            .filter((r) => r.ok && r.externalUrl)
            .map((r) => ({ label: `View on ${r.label} ↗`, href: r.externalUrl! }))
        );
        setStatusMessage(
          nextReceipts
            .map((r) => `${r.label}: ${r.ok ? 'published' : r.detail}`)
            .join(' · ')
        );
      }
      return;
    }

    if (inspectingNostr) {
      const nReceipt = await publishNostrSingle();
      setFlightReceipts([nReceipt]);
      setStatusLinks([]);
      setStatusMessage(nReceipt.detail);
      if (nReceipt.ok) launch(ctaRef.current);
      return;
    }

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

  const busyNow = isPublishing || nostrBusy;

  const primaryCtaLabel = (() => {
    if (busyNow) return totalSelected > 1 ? 'Transmitting…' : 'Sending…';
    if (totalSelected > 0) {
      return `Transmit to ${totalSelected} ${totalSelected === 1 ? 'room' : 'rooms'} →`;
    }
    if (inspectingNostr) return 'Publish to Nostr →';
    if (activeApi?.configured) return `Publish to ${activeSpec.shortName} →`;
    return `Copy & open ${activeSpec.shortName} ↗`;
  })();

  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      {layer}
      <StudioPaperCanvas />

      <div className="relative z-10 mx-auto w-full max-w-[1360px] px-5 sm:px-8 lg:px-12 py-6 sm:py-9 space-y-6">
        {pendingInbound && (
          <div
            role="status"
            data-studio-surface="true"
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--a-rule)] border-l-2 border-l-[var(--a-accent)] bg-[var(--a-well)]/95 px-4 py-3 text-[14px]"
          >
            <span>
              Loaded link from{' '}
              <strong>
                {pendingInbound.pipe ? `pipe\\${pendingInbound.pipe}` : 'Pipes'}
              </strong>
              . Replace current unsaved sheet?
            </span>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => {
                  applyInboundFromPipes(pendingInbound);
                  setPendingInbound(null);
                }}
                className="wc-link min-h-[36px] font-semibold text-[var(--a-accent-text)] cursor-pointer"
              >
                Load draft
              </button>
              <button
                type="button"
                onClick={() => setPendingInbound(null)}
                className="min-h-[36px] text-[13px] font-medium text-[var(--a-muted)] hover:text-[var(--a-ink)] cursor-pointer"
              >
                Keep current
              </button>
            </div>
          </div>
        )}

        {/* Balanced 2-Column Composing Sanctuary matching PublicDemo */}
        <div className="grid gap-6 lg:grid-cols-12 lg:gap-8 lg:items-stretch">
          {/* Left Column: Cotton-Paper Writing Sheet */}
          <section
            aria-label="Core thought"
            data-studio-surface="true"
            className="lg:col-span-5 relative group flex flex-col justify-between gap-5 rounded-2xl border border-[var(--a-rule)] bg-[var(--a-well)]/95 p-5 sm:p-7 shadow-[0_1px_0_rgba(17,24,39,0.06),0_26px_54px_-38px_rgba(42,47,69,0.28)]"
          >
            {/* Wet-pigment focus aura behind writing sheet */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -inset-4 -z-10 opacity-0 transition-opacity duration-500 group-focus-within:opacity-100"
              style={{
                background:
                  'radial-gradient(68% 68% at 24% 40%, rgba(247,185,201,0.28), rgba(250,214,184,0.16) 58%, transparent 80%)',
                filter: 'url(#wc-bleed)',
              }}
            />

            <div className="space-y-4">
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

              {/* Sheet Top Controls: Quiet Title & Publish Archive Controls */}
              <div className="space-y-3 border-b border-[var(--a-rule)]/70 pb-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  <TopicPicker value={brand} onChange={setBrand} label="Topic" />

                  <div className="flex flex-wrap items-center gap-3">
                    <details ref={pipeDetailsRef} className="relative">
                      <summary className="list-none inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-[var(--a-rule)] bg-[var(--a-bg)] px-3.5 text-[13px] font-semibold text-[var(--a-ink)] hover:border-[var(--a-accent)] cursor-pointer select-none whitespace-nowrap">
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
                          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full bg-[var(--a-accent-fill)] px-4 text-[14px] font-semibold text-white hover:bg-[var(--a-ink)] transition-colors disabled:opacity-50 cursor-pointer"
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
                      className="wc-link min-h-[38px] px-1 text-[14px] font-semibold text-[var(--a-ink)] cursor-pointer disabled:opacity-50 whitespace-nowrap"
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
                  <label htmlFor="studio-title" className="sr-only">
                    Note title
                  </label>
                  <input
                    id="studio-title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Give this thought a quiet title…"
                    className="w-full min-h-[42px] border-0 bg-transparent px-0 font-display text-2xl sm:text-[26px] font-bold tracking-[-0.03em] text-[var(--a-ink)] placeholder:text-[var(--a-muted)]/50 focus:outline-none"
                  />
                </div>
              </div>

              {/* Generous Seed Composing Box */}
              <div className="space-y-2">
                <label htmlFor="studio-seed" className="sr-only">
                  Your thought
                </label>
                <textarea
                  id="studio-seed"
                  value={seedText}
                  onChange={(e) => updateSeedText(e.target.value)}
                  placeholder="Write once in your own words — drop a link and asterisk keeps every room link-safe…"
                  className="asterisk-textarea block border-0 border-b border-[var(--a-rule)] bg-transparent px-0 py-1.5 font-serif text-[19px] sm:text-[20px] leading-[1.54] text-[var(--a-ink)] placeholder:text-[var(--a-muted)]/55 focus:border-[var(--a-accent)] focus:outline-none transition-colors"
                />

                <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] text-[var(--a-muted)]">
                  <span className="tabular-nums">
                    {seedWords} {seedWords === 1 ? 'word' : 'words'} · {seedText.length} chars
                  </span>
                  <span>Updates all six rooms live</span>
                </div>
              </div>

              {/* Inviting Empty-State Prompts when Sheet is Blank */}
              {!seedText.trim() && (
                <div className="pt-1 space-y-2">
                  <p className="inline-flex items-center gap-1.5 font-sans text-[13px] font-medium text-[var(--a-muted)]">
                    <Sparkles className="h-3.5 w-3.5 text-[var(--a-accent-text)]" aria-hidden="true" />
                    <span>Need a spark? Start with a template or saved note:</span>
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    {STARTER_PROMPTS.map((sp) => (
                      <button
                        key={sp.id}
                        type="button"
                        onClick={() => {
                          if (!title.trim()) setTitle(sp.title);
                          updateSeedText(sp.text);
                        }}
                        className="min-h-[36px] rounded-full border border-[var(--a-rule)] bg-[var(--a-bg)] px-3 text-[13px] font-medium text-[var(--a-ink)] hover:border-[var(--a-accent)] cursor-pointer transition-colors"
                      >
                        {sp.label}
                      </button>
                    ))}
                    {broadcasts.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setDrawerOpen(true)}
                        className="wc-link min-h-[36px] px-1 text-[13px] font-semibold text-[var(--a-accent-text)] cursor-pointer"
                      >
                        Open # Hash ({broadcasts.length})
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[var(--a-rule)]/70">
              <MediaTray
                attachments={attachments}
                onChangeAttachments={setAttachments}
                mediaNote={mediaNote}
                onChangeMediaNote={setMediaNote}
                compact
              />
            </div>
          </section>

          {/* Right Column: Segmented Channel Rail + Living Weather Preview + Unified Flight Deck */}
          <div className="lg:col-span-7 min-w-0 flex flex-col justify-between gap-3.5">
            <div className="space-y-2.5" data-studio-surface="true">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-sans text-[13px] font-medium text-[var(--a-muted)]">
                  Inspect any room — or choose an audience profile below to transmit
                </p>
                <Link
                  href="/app/setup?tab=publishing"
                  className="wc-link text-[13px] font-semibold text-[var(--a-ink)]"
                >
                  Manage connections →
                </Link>
              </div>

              <HorizonTabs
                active={effectivePlatform}
                onSelect={handleSelectPlatform}
                posted={postedMap}
                connected={connectedMap}
                idBase={tabsId}
                label="Workspace channels"
                showNostr={showNostrTab}
                nostrSelected={inspectingNostr}
                nostrConnected={Boolean(nostrStatus?.connected)}
                onSelectNostr={() => setInspectingNostr(true)}
              />
            </div>

            {/* Cohesive Living Room Stage */}
            <div
              role="tabpanel"
              aria-labelledby={inspectingNostr ? `${tabsId}-tab-nostr` : `${tabsId}-tab-${effectivePlatform}`}
              data-studio-surface="true"
              className="flex-1 flex flex-col justify-between rounded-2xl border border-[var(--a-rule)] bg-[var(--a-well)]/96 overflow-hidden shadow-[0_1px_0_rgba(17,24,39,0.06),0_26px_54px_-38px_rgba(42,47,69,0.32)]"
            >
              {/* Living Animated Watercolor Weather Header */}
              <div className="relative overflow-hidden border-b border-[var(--a-rule)] px-5 py-3.5">
                <AnimatePresence initial={false}>
                  <m.div
                    key={weather}
                    initial={reduce ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
                    aria-hidden="true"
                    className="pointer-events-none absolute -inset-[12%] blur-[2px]"
                    style={{ background: w.wash }}
                  />
                </AnimatePresence>

                {!reduce && (
                  <>
                    <m.div
                      aria-hidden="true"
                      animate={{ x: [-14, 16, -14], y: [-4, 6, -4], scale: [1, 1.08, 1] }}
                      transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
                      className="pointer-events-none absolute -left-8 -top-6 h-24 w-56 rounded-full opacity-45 blur-xl"
                      style={{
                        background:
                          weather === 'clear'
                            ? 'radial-gradient(circle, rgba(169,211,234,0.85), transparent 72%)'
                            : weather === 'dawn'
                              ? 'radial-gradient(circle, rgba(247,185,201,0.85), transparent 72%)'
                              : 'radial-gradient(circle, rgba(207,205,216,0.85), transparent 72%)',
                      }}
                    />
                    <m.div
                      aria-hidden="true"
                      animate={{ x: [14, -14, 14], y: [5, -5, 5], scale: [1.06, 0.96, 1.06] }}
                      transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
                      className="pointer-events-none absolute -right-8 -bottom-6 h-24 w-56 rounded-full opacity-40 blur-xl"
                      style={{
                        background:
                          weather === 'clear'
                            ? 'radial-gradient(circle, rgba(247,185,201,0.75), transparent 72%)'
                            : weather === 'dawn'
                              ? 'radial-gradient(circle, rgba(250,214,184,0.8), transparent 72%)'
                              : 'radial-gradient(circle, rgba(195,196,208,0.8), transparent 72%)',
                      }}
                    />
                  </>
                )}

                <div className="relative space-y-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <div className="flex flex-wrap items-baseline gap-x-2.5">
                      <span className="font-display text-[17px] font-bold tracking-[-0.02em] text-[var(--a-ink)]">
                        {inspectingNostr ? 'Clear relay sky' : w.label}
                      </span>
                      <span className="text-[13px] text-[var(--a-ink)]/75">
                        {inspectingNostr
                          ? 'Signed NIP-07 kind:1 note · No character cap or link penalty'
                          : issues[0]
                            ? `${issues[0].label} — ${issues[0].detail}`
                            : w.detail}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {urlFix && (
                        <button
                          type="button"
                          onClick={() => handleMoveLinksToReply(effectivePlatform)}
                          className="wc-link text-[13px] font-semibold text-[var(--a-accent-text)] cursor-pointer"
                        >
                          Fix link
                        </button>
                      )}
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
                        <span className="text-[var(--a-ink)]/65">
                          {inspectingNostr
                            ? ` chars · ${wordCount} ${wordCount === 1 ? 'word' : 'words'}`
                            : ` / ${activeSpec.charLimit} · ${wordCount} ${wordCount === 1 ? 'word' : 'words'}`}
                        </span>
                      </span>
                    </div>
                  </div>

                  <div
                    className="h-[3px] w-full overflow-hidden rounded-full bg-[var(--a-ink)]/10"
                    aria-hidden="true"
                  >
                    <div
                      className={`h-full transition-[width,background-color] duration-200 ${
                        overHardLimit
                          ? 'bg-[var(--a-accent)]'
                          : inSweetSpot || inspectingNostr
                            ? 'bg-[var(--a-emerald)]'
                            : 'bg-[var(--a-ink)]/45'
                      }`}
                      style={{ width: `${meterPct}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Fluid Room Preview Body + Subtle Folon Room Vignette */}
              <div className="relative flex-1 overflow-hidden px-5 py-5 sm:px-6 sm:py-6">
                {!inspectingNostr && (
                  <img
                    src={roomVignette.srcSmall}
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none select-none absolute -right-5 -bottom-6 w-36 sm:w-44 aspect-[3/4] object-cover opacity-[0.08] wc-glaze wc-wet-edge"
                  />
                )}

                <AnimatePresence mode="wait" initial={false}>
                  {inspectingNostr ? (
                    <m.div
                      key="nostr"
                      initial={reduce ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduce ? undefined : { opacity: 0, y: -8 }}
                      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                      className="relative z-10 space-y-4"
                    >
                      <p className="font-serif italic text-[16px] text-[var(--a-muted)]">
                        Sovereign readers on Damus, Primal, Amethyst, and Yakihonne — chronologically ordered, zero algorithmic throttling.
                      </p>

                      {seedText.trim() ? (
                        <article className="grid grid-cols-[2.25rem_1fr] gap-3">
                          {nostrStatus?.picture ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={nostrStatus.picture}
                              alt=""
                              className="mt-1 h-8 w-8 rounded-full object-cover border border-[var(--a-rule)]"
                            />
                          ) : (
                            <span
                              aria-hidden="true"
                              className="mt-1 h-8 w-8 rounded-full bg-[radial-gradient(circle_at_35%_35%,#9C8FD0,#FE299E)]"
                            />
                          )}
                          <div className="min-w-0 space-y-2">
                            <p className="text-[14px] text-[var(--a-muted)]">
                              <span className="font-semibold text-[var(--a-ink)]">
                                {nostrStatus?.handle || 'npub'}
                              </span>{' '}
                              <span>· kind:1 note</span>
                            </p>
                            <p className="whitespace-pre-wrap break-words text-[17px] leading-[1.55] text-[var(--a-ink)]">
                              {seedText.trim()}
                            </p>
                          </div>
                        </article>
                      ) : (
                        <p className="font-serif italic text-lg text-[var(--a-muted)]">
                          Your Nostr note will appear here as soon as you begin writing on the left sheet.
                        </p>
                      )}

                      <p className="border-t border-[var(--a-rule)] pt-3 font-code text-[13px] text-[var(--a-muted)]">
                        Relays: wss://relay.damus.io · wss://nos.lol · wss://relay.nostr.band
                      </p>
                    </m.div>
                  ) : (
                    <m.div
                      key={effectivePlatform}
                      initial={reduce ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduce ? undefined : { opacity: 0, y: -8 }}
                      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                      className="relative z-10 space-y-4"
                    >
                      <p className="font-serif italic text-[16px] text-[var(--a-muted)]">
                        {activeGuide.audiencePortrait}
                      </p>

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

                      {issues.length > 0 && (
                        <WeatherBand
                          analysis={analysis}
                          onFix={() => handleMoveLinksToReply(effectivePlatform)}
                        />
                      )}
                    </m.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Unified Flight Deck: Audience Profiles + Destinations + Single Sovereign Primary CTA */}
              <div className="border-t border-[var(--a-rule)] bg-[var(--a-surface)]/45 px-5 py-4 sm:px-6 space-y-3.5">
                {profiles.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-sans text-[13px] font-semibold uppercase tracking-[0.1em] text-[var(--a-muted)] mr-1">
                      Audience:
                    </span>
                    {profiles.map((prof) => {
                      const profTargets = prof.platforms.filter((p): p is PlatformId =>
                        connectedPlatforms.includes(p as PlatformId)
                      );
                      const profWantsNostr = prof.platforms.includes('nostr') && showNostrTab;
                      const isMatch =
                        profTargets.length === activeTargets.length &&
                        profTargets.every((p) => activeTargets.includes(p)) &&
                        profWantsNostr === includeNostr &&
                        (profTargets.length > 0 || profWantsNostr);
                      return (
                        <button
                          key={prof.id}
                          type="button"
                          onClick={() => {
                            setSelectedTargets(profTargets);
                            setIncludeNostr(profWantsNostr);
                          }}
                          className={`min-h-[36px] rounded-full border px-3.5 text-[13px] font-semibold cursor-pointer transition-colors ${
                            isMatch
                              ? 'border-[var(--a-accent)] bg-[var(--a-accent-fill)] text-white'
                              : 'border-[var(--a-rule)] bg-[var(--a-well)] text-[var(--a-ink)] hover:border-[var(--a-accent)]'
                          }`}
                        >
                          {prof.name}
                        </button>
                      );
                    })}
                    {totalSelected > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTargets([]);
                          setIncludeNostr(false);
                        }}
                        className="min-h-[36px] px-2 text-[13px] font-medium text-[var(--a-muted)] hover:text-[var(--a-ink)] cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                )}

                {hasAnyConnectedDestination && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-sans text-[13px] font-semibold uppercase tracking-[0.1em] text-[var(--a-muted)] mr-1">
                      Transmit to:
                    </span>
                    {connectedPlatforms.map((pid) => {
                      const checked = activeTargets.includes(pid);
                      const handle = apiStatus?.[pid]?.handle;
                      return (
                        <button
                          key={pid}
                          type="button"
                          aria-pressed={checked}
                          onClick={() =>
                            setSelectedTargets((prev) =>
                              prev.includes(pid) ? prev.filter((x) => x !== pid) : [...prev, pid]
                            )
                          }
                          className={`min-h-[38px] rounded-full border px-3.5 text-[13px] font-medium cursor-pointer transition-colors ${
                            checked
                              ? 'border-[var(--a-ink)] bg-[var(--a-ink)] text-white'
                              : 'border-[var(--a-rule)] bg-[var(--a-well)] text-[var(--a-ink)]/80 hover:border-[var(--a-ink)]'
                          }`}
                        >
                          {PLATFORM_SPECS[pid].shortName}
                          {handle ? ` · ${handle}` : ''}
                        </button>
                      );
                    })}
                    {showNostrTab && (
                      <button
                        type="button"
                        aria-pressed={includeNostr}
                        onClick={() => setIncludeNostr((v) => !v)}
                        className={`min-h-[38px] rounded-full border px-3.5 text-[13px] font-medium cursor-pointer transition-colors ${
                          includeNostr
                            ? 'border-[var(--a-ink)] bg-[var(--a-ink)] text-white'
                            : 'border-[var(--a-rule)] bg-[var(--a-well)] text-[var(--a-ink)]/80 hover:border-[var(--a-ink)]'
                        }`}
                      >
                        Nostr{nostrStatus?.handle ? ` · ${nostrStatus.handle}` : ''}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          activeTargets.length === connectedPlatforms.length &&
                          (!showNostrTab || includeNostr)
                        ) {
                          setSelectedTargets([]);
                          setIncludeNostr(false);
                        } else {
                          setSelectedTargets(connectedPlatforms);
                          if (showNostrTab) setIncludeNostr(true);
                        }
                      }}
                      className="wc-link min-h-[38px] px-1 text-[13px] font-semibold text-[var(--a-muted)] hover:text-[var(--a-ink)] cursor-pointer"
                    >
                      All connected
                    </button>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                    <button
                      ref={ctaRef}
                      type="button"
                      disabled={busyNow}
                      onClick={onPrimaryPublish}
                      {...bloomHandlers<HTMLButtonElement>()}
                      className="wc-cta inline-flex min-h-[48px] items-center gap-2 rounded-full bg-[var(--a-accent-fill)] px-7 text-base font-semibold text-white shadow-[0_14px_36px_-14px_rgba(254,41,158,0.7)] disabled:opacity-50 cursor-pointer"
                    >
                      <span>{primaryCtaLabel}</span>
                    </button>

                    {!inspectingNostr && (
                      <button
                        type="button"
                        onClick={async () => {
                          const ok = await handleCopyAndLog(effectivePlatform, true);
                          if (ok) launch(ctaRef.current);
                        }}
                        className="wc-link min-h-[40px] text-[14px] font-semibold text-[var(--a-ink)] cursor-pointer"
                      >
                        or copy &amp; open {activeSpec.shortName} ↗
                      </button>
                    )}

                    {!hasAnyConnectedDestination && (
                      <Link
                        href="/app/setup?tab=publishing"
                        className="wc-link min-h-[40px] inline-flex items-center text-[14px] font-semibold text-[var(--a-accent-text)]"
                      >
                        Connect accounts in Setup →
                      </Link>
                    )}
                  </div>

                  {!hasAnyConnectedDestination && !inspectingNostr && (
                    <span className="font-sans text-[13px] text-[var(--a-muted)]">
                      {activeApi?.note || 'Copy-ready'}
                    </span>
                  )}
                </div>

                {/* Live Flight Receipt Strip */}
                {flightReceipts.length > 0 && (
                  <div
                    aria-live="polite"
                    className="border-t border-[var(--a-rule)] pt-3 flex flex-wrap items-center justify-between gap-2"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      {flightReceipts.map((r) => (
                        <span
                          key={r.key}
                          className={`inline-flex min-h-[34px] items-center gap-2 rounded-full border px-3 text-[13px] font-medium ${
                            r.ok
                              ? 'border-[var(--a-emerald)]/35 bg-[var(--a-well)] text-[var(--a-ink)]'
                              : 'border-[var(--a-accent)]/40 bg-[var(--a-well)] text-[var(--a-ink)]'
                          }`}
                        >
                          <span className={r.ok ? 'text-[var(--a-emerald)] font-semibold' : 'text-[var(--a-accent-text)] font-semibold'}>
                            {r.ok ? '✓' : '·'} {r.label}
                          </span>
                          {r.externalUrl ? (
                            <a
                              href={r.externalUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="wc-link inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--a-accent-text)]"
                            >
                              View <ExternalLink className="h-3 w-3" aria-hidden="true" />
                            </a>
                          ) : !r.ok && r.composeUrl ? (
                            <a
                              href={r.composeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="wc-link text-[13px] font-semibold text-[var(--a-accent-text)]"
                            >
                              Copy &amp; open ↗
                            </a>
                          ) : (
                            <span className="text-[13px] text-[var(--a-muted)]">{r.detail}</span>
                          )}
                        </span>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setFlightReceipts([])}
                      className="min-h-[34px] px-2 text-[13px] font-medium text-[var(--a-muted)] hover:text-[var(--a-ink)] cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <p className="hidden md:block font-serif italic text-[14px] text-[var(--a-muted)]">
          <span className="not-italic text-[var(--a-accent)] mr-1.5">*</span>
          Move or tap across the open paper margin to drop water and Folon pigment — washes bloom and evaporate on their own.
        </p>
      </div>
    </div>
  );
}
