'use client';

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { Check, Copy, Pause, PenLine, Play, RotateCw } from 'lucide-react';
import HorizonTabs from '@/components/compose/HorizonTabs';
import MediaTray from '@/components/compose/MediaTray';
import PostPreview from '@/components/compose/PostPreview';
import { useEnvelopeFlight } from '@/components/compose/EnvelopeFlight';
import { bloomHandlers } from '@/art/bloom';
import { useSessionStatus } from '@/lib/use-session-status';
import {
  adaptSeedToPlatform,
  analyzeDraftForPlatform,
  countWords,
  extractLinksForThreadsReply,
  PLATFORM_GUIDES,
  PLATFORM_ORDER,
  PLATFORM_SPECS,
  type MediaAttachment,
  type PlatformId,
} from '@/lib/platforms';
import { readinessToWeather, WEATHER } from '@/lib/weather';

const PRESETS: Array<{ id: string; label: string; text: string }> = [
  {
    id: 'shipping',
    label: 'Shipping note',
    text: 'Spent the weekend replacing every card in our app with plain typography and a little watercolor.\n\nIt is calmer, faster, and people finally read the words. What would you cut first?\n\nhttps://asterisk.pipes.pink',
  },
  {
    id: 'thread',
    label: 'Long X thread',
    text: 'Three lessons after shipping six social room tuners in one codebase:\n\n1. Links in the main body of Threads or Facebook posts quietly throttle reach—isolate them into the first self-reply.\n\n2. Long build notes belong as clean 280-char X sentences, not truncated ellipses.\n\n3. Show readiness as changing sky weather, never streak-counter guilt.\n\nRead the full notes: https://asterisk.pipes.pink/colophon',
  },
  {
    id: 'photo',
    label: 'Photo update',
    text: 'Testing wet-on-wet watercolor blooms over a sunrise horizon—sweep your cursor across the page and watch pigments bleed into cotton paper.\n\nNo AI rewrites, no scheduler lock-in. Just one thought tuned for each room.\n\nhttps://asterisk.pipes.pink',
  },
];

/**
 * Public, account-free demo. Everything stays in this browser tab; nothing is sent anywhere.
 * Equal-height two-column stage with living animated watercolor weather and smooth room transitions.
 */
export default function PublicDemo() {
  const tabsId = useId();
  const sectionRef = useRef<HTMLElement>(null);
  const copyRef = useRef<HTMLButtonElement>(null);
  const reduce = useReducedMotion();
  const { launch, layer } = useEnvelopeFlight();
  const { authenticated, pipesSignedIn } = useSessionStatus();
  const isLoggedIn = authenticated || pipesSignedIn;

  const [seed, setSeed] = useState(PRESETS[0].text);
  const [media, setMedia] = useState('');
  const [attachments, setAttachments] = useState<MediaAttachment[]>([]);
  const [active, setActive] = useState<PlatformId>('threads');
  const [overrides, setOverrides] = useState<
    Partial<Record<PlatformId, { body: string; reply: string }>>
  >({});
  const [status, setStatus] = useState('');
  const [inView, setInView] = useState(false);
  const [autoCycle, setAutoCycle] = useState(true);
  const [previewHovered, setPreviewHovered] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [copiedReply, setCopiedReply] = useState(false);

  const isTourPlaying = autoCycle && inView && !previewHovered && !customizeOpen && !reduce;

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.25 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!isTourPlaying) return;
    const id = window.setInterval(() => {
      setActive((prev) => {
        const idx = PLATFORM_ORDER.indexOf(prev);
        return PLATFORM_ORDER[(idx + 1) % PLATFORM_ORDER.length];
      });
    }, 3400);
    return () => window.clearInterval(id);
  }, [isTourPlaying]);

  const adapted = useMemo(() => adaptSeedToPlatform(active, seed), [active, seed]);
  const draft = overrides[active] ?? { body: adapted.bodyText, reply: adapted.replyText };
  const analysis = useMemo(
    () => analyzeDraftForPlatform(active, draft.body, draft.reply, media, attachments),
    [active, draft.body, draft.reply, media, attachments]
  );
  const spec = PLATFORM_SPECS[active];
  const weather = readinessToWeather(analysis.readiness);
  const w = WEATHER[weather];
  const issues = analysis.checks.filter((c) => c.status !== 'pass');
  const urlFix = issues.find((c) => c.fixAction === 'move_url_to_reply');

  const charCount = draft.body.length;
  const wordCount = countWords(draft.body);
  const overHardLimit = active !== 'x' && charCount > spec.charLimit;
  const inSweetSpot = charCount >= spec.sweetSpotMin && charCount <= spec.sweetSpotMax;
  const meterPct = Math.min(100, Math.round((charCount / spec.charLimit) * 100));
  const hasUrlInBody = /https?:\/\/[^\s]+/i.test(draft.body);

  function handleSelectRoom(p: PlatformId) {
    setAutoCycle(false);
    setActive(p);
  }

  function applyPreset(text: string) {
    setSeed(text);
    setOverrides({});
    setStatus('');
  }

  function editBody(body: string) {
    setAutoCycle(false);
    setOverrides((o) => ({ ...o, [active]: { body, reply: draft.reply } }));
  }

  function fix() {
    const { mainText, replyText } = extractLinksForThreadsReply(draft.body);
    setOverrides((o) => ({
      ...o,
      [active]: { body: mainText, reply: replyText || draft.reply },
    }));
  }

  async function copyReplyLink() {
    const clean = draft.reply.trim();
    if (!clean) return;
    try {
      await navigator.clipboard.writeText(clean);
      setCopiedReply(true);
      setTimeout(() => setCopiedReply(false), 1800);
      setStatus(
        `Copied ${spec.shortName} ${active === 'threads' ? 'self-reply' : 'first comment'} link.`
      );
    } catch {
      setStatus('Your browser blocked clipboard access. Copy the reply link manually.');
    }
  }

  async function copyAndOpen() {
    if (!draft.body.trim()) return;
    try {
      await navigator.clipboard.writeText(draft.body.trim());
      launch(copyRef.current);
      window.open(spec.composeUrl, '_blank', 'noopener,noreferrer');
      setStatus(
        draft.reply.trim()
          ? `Copied for ${spec.shortName}. After posting, click "Copy reply" inside the thread to paste your link.`
          : `Copied for ${spec.shortName}. Paste it into the composer that just opened.`
      );
    } catch {
      setStatus('Your browser blocked clipboard access. Select the text and copy it manually.');
    }
  }

  return (
    <section
      ref={sectionRef}
      id="demo"
      aria-labelledby="demo-title"
      className="relative scroll-mt-24 bg-[var(--a-bg)] py-12 sm:py-16"
    >
      {layer}
      <div className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12">
        <div className="grid gap-4 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <p className="font-sans text-[13px] font-semibold uppercase tracking-[0.16em] text-[var(--a-muted)]">
              Try it · no account
            </p>
            <h2 id="demo-title" className="mt-2 font-display text-big font-bold text-[var(--a-ink)]">
              Write once. <span className="font-serif italic font-normal">Watch it travel.</span>
            </h2>
          </div>
          <p className="lg:col-span-4 text-[15px] leading-relaxed text-[var(--a-muted)]">
            Everything stays in this tab. Watch one thought reformat across all six rooms automatically,
            or pick any channel to inspect.
          </p>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-12 lg:gap-8 lg:items-stretch">
          {/* Left: Equal-height calm paper writing sheet */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-5 rounded-2xl border border-[var(--a-rule)] bg-[var(--a-well)]/75 p-5 sm:p-6">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label
                  htmlFor="demo-seed"
                  className="font-display text-lg font-bold text-[var(--a-ink)]"
                >
                  Your thought
                </label>
                <div className="flex flex-wrap items-center gap-1.5" aria-label="Sample prompts">
                  {PRESETS.map((preset) => {
                    const isCurrent = seed === preset.text;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => applyPreset(preset.text)}
                        className={`min-h-[30px] rounded-full px-2.5 py-1 text-[12px] font-semibold border transition-colors cursor-pointer ${
                          isCurrent
                            ? 'border-[var(--a-ink)] bg-[var(--a-ink)] text-[var(--a-bg)]'
                            : 'border-[var(--a-rule)] bg-[var(--a-well)] text-[var(--a-ink)]/80 hover:border-[var(--a-ink)]/45 hover:text-[var(--a-ink)]'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <textarea
                id="demo-seed"
                value={seed}
                onChange={(e) => {
                  setAutoCycle(false);
                  setSeed(e.target.value);
                  setOverrides({});
                }}
                className="asterisk-textarea block w-full resize-none overflow-hidden border-0 border-b border-[var(--a-rule)] bg-transparent px-0 py-1 font-serif text-[19px] leading-[1.52] text-[var(--a-ink)] focus:border-[var(--a-accent)] focus:outline-none focus-visible:outline-none transition-colors"
              />
            </div>

            <div className="pt-2 border-t border-[var(--a-rule)]/60">
              <MediaTray
                attachments={attachments}
                onChangeAttachments={(next) => {
                  setAutoCycle(false);
                  setAttachments(next);
                }}
                mediaNote={media}
                onChangeMediaNote={setMedia}
              />
            </div>
          </div>

          {/* Right: Segmented clickable pills + living weather stage + unified footer */}
          <div className="lg:col-span-7 min-w-0 flex flex-col justify-between gap-3">
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-sans text-[13px] font-medium text-[var(--a-muted)]">
                  Click any room to inspect — or watch it travel
                </p>
                <button
                  type="button"
                  onClick={() => setAutoCycle((c) => !c)}
                  className={`inline-flex min-h-[30px] items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-semibold cursor-pointer transition-colors ${
                    autoCycle
                      ? 'border-[var(--a-accent)]/40 bg-[var(--a-well)] text-[var(--a-accent-text)] hover:border-[var(--a-accent)]'
                      : 'border-[var(--a-rule)] bg-[var(--a-well)] text-[var(--a-ink)] hover:border-[var(--a-ink)]/45'
                  }`}
                >
                  {autoCycle ? (
                    <>
                      <Pause className="h-3 w-3" aria-hidden="true" />
                      <span>Playing ↻</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-3 w-3" aria-hidden="true" />
                      <span>Paused · Resume tour</span>
                      <RotateCw className="h-3 w-3" aria-hidden="true" />
                    </>
                  )}
                </button>
              </div>

              <HorizonTabs
                active={active}
                onSelect={handleSelectRoom}
                idBase={tabsId}
                label="Demo channels"
                autoProgress={isTourPlaying}
              />
            </div>

            {/* Cohesive preview stage card */}
            <div
              role="tabpanel"
              aria-labelledby={`${tabsId}-tab-${active}`}
              onMouseEnter={() => setPreviewHovered(true)}
              onMouseLeave={() => setPreviewHovered(false)}
              className="flex-1 flex flex-col justify-between rounded-2xl border border-[var(--a-rule)] bg-[var(--a-well)] overflow-hidden shadow-[0_1px_0_rgba(17,24,39,0.06),0_26px_54px_-38px_rgba(42,47,69,0.32)]"
            >
              {/* Living animated watercolor weather header */}
              <div className="relative overflow-hidden border-b border-[var(--a-rule)] px-5 py-3">
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
                        {w.label}
                      </span>
                      <span className="text-[13px] text-[var(--a-ink)]/75">
                        {issues[0] ? `${issues[0].label} — ${issues[0].detail}` : w.detail}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {urlFix && (
                        <button
                          type="button"
                          onClick={fix}
                          className="wc-link text-[13px] font-semibold text-[var(--a-accent-text)] cursor-pointer"
                        >
                          Fix link
                        </button>
                      )}
                      <span className="font-sans text-[12px] tabular-nums whitespace-nowrap">
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
                          {' '}
                          / {spec.charLimit} chars · {wordCount}{' '}
                          {wordCount === 1 ? 'word' : 'words'}
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
                          : inSweetSpot
                            ? 'bg-[var(--a-emerald)]'
                            : 'bg-[var(--a-ink)]/45'
                      }`}
                      style={{ width: `${meterPct}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Fluid room transition preview body */}
              <div className="flex-1 px-5 py-4 sm:px-6 sm:py-5">
                <AnimatePresence mode="wait" initial={false}>
                  <m.div
                    key={active}
                    initial={reduce ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduce ? undefined : { opacity: 0, y: -8 }}
                    transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                    className="space-y-3.5"
                  >
                    <p className="font-serif italic text-[15px] text-[var(--a-muted)]">
                      {PLATFORM_GUIDES[active].audiencePortrait}
                    </p>

                    <PostPreview
                      platform={active}
                      body={draft.body}
                      reply={draft.reply}
                      attachments={attachments}
                    />

                    {(active === 'threads' || active === 'facebook') &&
                      (draft.reply.trim() || hasUrlInBody) && (
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[13px]">
                          <span className="text-[var(--a-muted)]">
                            Link isolated safely in {active === 'threads' ? 'self-reply' : 'first comment'}
                          </span>
                          <div className="flex items-center gap-2">
                            {hasUrlInBody && (
                              <button
                                type="button"
                                onClick={fix}
                                className="wc-link font-semibold text-[var(--a-accent-text)] cursor-pointer"
                              >
                                Move URL out
                              </button>
                            )}
                            {draft.reply.trim() && (
                              <button
                                type="button"
                                onClick={copyReplyLink}
                                className="inline-flex min-h-[30px] items-center gap-1.5 rounded-full border border-[var(--a-rule)] bg-[var(--a-surface)]/70 px-3 text-[12px] font-semibold text-[var(--a-ink)] hover:border-[var(--a-accent)] cursor-pointer transition-colors"
                              >
                                {copiedReply ? (
                                  <>
                                    <Check className="h-3 w-3 text-[var(--a-emerald)]" aria-hidden="true" />
                                    <span>Copied reply</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3 w-3 text-[var(--a-accent-text)]" aria-hidden="true" />
                                    <span>Copy reply</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                    {customizeOpen && (
                      <div className="border-t border-[var(--a-rule)] pt-3">
                        <textarea
                          aria-label={`${spec.name} copy`}
                          rows={3}
                          value={draft.body}
                          onChange={(e) => editBody(e.target.value)}
                          className="asterisk-textarea-compact block w-full rounded-lg border border-[var(--a-rule)] bg-[var(--a-bg)] px-3.5 py-2 text-[15px] leading-relaxed text-[var(--a-ink)] focus:border-[var(--a-accent)] focus:outline-none"
                        />
                      </div>
                    )}
                  </m.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Unified bottom action bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <button
                  ref={copyRef}
                  type="button"
                  onClick={copyAndOpen}
                  {...bloomHandlers<HTMLButtonElement>()}
                  className="wc-cta inline-flex min-h-[46px] items-center gap-2 rounded-full bg-[var(--a-accent-fill)] px-6 text-[15px] font-semibold text-white cursor-pointer shadow-[0_14px_36px_-14px_rgba(254,41,158,0.7)]"
                >
                  Copy &amp; open {spec.shortName} <span aria-hidden="true">↗</span>
                </button>
                <button
                  type="button"
                  aria-expanded={customizeOpen}
                  onClick={() => setCustomizeOpen((o) => !o)}
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-[var(--a-rule)] bg-[var(--a-well)] px-3.5 text-[13px] font-semibold text-[var(--a-ink)] hover:border-[var(--a-ink)]/45 cursor-pointer transition-colors"
                >
                  <PenLine className="h-3.5 w-3.5 text-[var(--a-muted)]" aria-hidden="true" />
                  <span>{customizeOpen ? 'Done editing' : `Customize ${spec.shortName}`}</span>
                </button>
                <Link
                  href={isLoggedIn ? '/app' : '/login?intent=signup'}
                  className="wc-link min-h-[38px] inline-flex items-center text-[14px] font-semibold text-[var(--a-ink)]"
                >
                  {isLoggedIn ? 'Open composing desk →' : 'Sign up to publish directly'}
                </Link>
              </div>

              {status && (
                <p role="status" aria-live="polite" className="text-[13px] text-[var(--a-ink)]/80">
                  {status}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
