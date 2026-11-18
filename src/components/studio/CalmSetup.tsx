'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { AccentHairlineItem, AccentHairlineList, AccentInput, Eyebrow } from 'accent-ui';
import WatercolorSky, { DAWN_PALETTE } from '@/art/WatercolorSky';
import { bloomHandlers } from '@/art/bloom';
import { useStudio } from '@/components/studio/StudioContext';
import { ART } from '@/lib/art-direction';
import { connectNostrExtension } from '@/lib/nostr-client';
import { PLATFORM_GUIDES, PLATFORM_ORDER, PLATFORM_SPECS, type PlatformId } from '@/lib/platforms';

type SetupStep = 'accounts' | 'handles' | 'publishing';

const STEP_TABS: { id: SetupStep; label: string }[] = [
  { id: 'accounts', label: '01 · Room Guides' },
  { id: 'handles', label: '02 · Handles & Rhythm' },
  { id: 'publishing', label: '03 · Connected Accounts & Profiles' },
];

const CADENCE_PRESETS = [
  { label: 'Daily', days: 1 },
  { label: '3d', days: 3 },
  { label: 'Weekly', days: 7 },
  { label: '14d', days: 14 },
];

const DEFAULT_PROFILE_STORAGE_KEY = 'asterisk_default_profile_id';

export default function CalmSetup() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const oauthError = searchParams.get('oauth_error');
  const connectedParam = searchParams.get('connected');
  const initialTab = searchParams.get('tab') === 'publishing' ? 'publishing' : 'accounts';
  const tabsId = useId();
  const reduce = useReducedMotion();
  const tabRefs = useRef<Partial<Record<SetupStep, HTMLButtonElement | null>>>({});

  const {
    checklist,
    platformSettings,
    apiStatus,
    nostrStatus,
    refreshStudio,
    handleToggleChecklist,
    handleSavePlatformSetting,
  } = useStudio();

  const [step, setStep] = useState<SetupStep>(initialTab);
  const [draftHandles, setDraftHandles] = useState<Record<string, string>>({});
  const [draftCadences, setDraftCadences] = useState<Record<string, number>>({});
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});
  const [isFinishing, setIsFinishing] = useState(false);

  const [localNostrHandle, setLocalNostrHandle] = useState<string | null>(null);
  const [nostrError, setNostrError] = useState<string | null>(null);
  const [switchingPageId, setSwitchingPageId] = useState<string | null>(null);
  const [disconnectingPlatform, setDisconnectingPlatform] = useState<string | null>(null);

  const [profiles, setProfiles] = useState<Array<{ id: number; name: string; platforms: string[] }>>([]);
  const [defaultProfileId, setDefaultProfileId] = useState<number | null>(null);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfilePlatforms, setNewProfilePlatforms] = useState<string[]>(['x', 'threads']);
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    fetch('/api/profiles')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.profiles) setProfiles(d.profiles);
      })
      .catch(() => {});

    if (typeof window !== 'undefined') {
      const savedDefault = Number(window.localStorage.getItem(DEFAULT_PROFILE_STORAGE_KEY) || 0);
      if (savedDefault) setDefaultProfileId(savedDefault);
    }
  }, []);

  const doneCount = checklist.filter((c) => c.completed).length;
  const firstIncompleteIdx = checklist.findIndex((c) => !c.completed);
  const isNostrConnected = Boolean(localNostrHandle || nostrStatus?.connected);
  const displayNostrHandle = localNostrHandle || nostrStatus?.handle;
  const connectedCount =
    PLATFORM_ORDER.filter((pid) => apiStatus?.[pid]?.configured).length + (isNostrConnected ? 1 : 0);

  function selectStep(next: SetupStep, focus = false) {
    setStep(next);
    const el = tabRefs.current[next];
    if (el) {
      if (focus) el.focus();
      el.scrollIntoView({
        block: 'nearest',
        inline: 'nearest',
        ...({ container: 'nearest' } as Record<string, string>),
      } as ScrollIntoViewOptions);
    }
  }

  function onTabKeyDown(e: React.KeyboardEvent, idx: number) {
    const n = STEP_TABS.length;
    const nextIdx =
      e.key === 'ArrowRight'
        ? (idx + 1) % n
        : e.key === 'ArrowLeft'
          ? (idx - 1 + n) % n
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? n - 1
              : null;
    if (nextIdx !== null) {
      e.preventDefault();
      selectStep(STEP_TABS[nextIdx].id, true);
    }
  }

  function toggleDefaultProfile(id: number) {
    const next = defaultProfileId === id ? null : id;
    setDefaultProfileId(next);
    if (typeof window !== 'undefined') {
      if (next) {
        window.localStorage.setItem(DEFAULT_PROFILE_STORAGE_KEY, String(next));
      } else {
        window.localStorage.removeItem(DEFAULT_PROFILE_STORAGE_KEY);
      }
    }
  }

  async function finishSetup() {
    if (isFinishing) return;
    setIsFinishing(true);
    try {
      for (const setting of platformSettings) {
        const handle =
          draftHandles[setting.platform] !== undefined
            ? draftHandles[setting.platform]
            : setting.handle;
        const cadence =
          draftCadences[setting.platform] !== undefined
            ? draftCadences[setting.platform]
            : setting.cadence_days;
        if (handle !== setting.handle || cadence !== setting.cadence_days) {
          await handleSavePlatformSetting(setting.platform, handle, cadence);
        }
      }
      router.push('/app');
    } finally {
      setIsFinishing(false);
    }
  }

  function formatChannelBadge(pid: string): string {
    if (pid === 'nostr') {
      return displayNostrHandle ? `Nostr · ${displayNostrHandle}` : 'Nostr';
    }
    const spec = PLATFORM_SPECS[pid as PlatformId];
    const h = apiStatus?.[pid as PlatformId]?.handle;
    if (!spec) return pid;
    return h ? `${spec.shortName} · ${h}` : spec.shortName;
  }

  return (
    <div className="pb-16 space-y-10">
      {/* Dawn Watercolor Masthead + Horizon Bird Wire + Stepper Rail */}
      <section className="relative overflow-hidden border-b border-[var(--a-rule)]">
        <WatercolorSky
          palette={DAWN_PALETTE}
          fallbackSrc={ART.skyBold.src}
          className="opacity-50"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[var(--a-bg)]/50 via-[var(--a-bg)]/78 to-[var(--a-bg)]"
        />

        <div className="relative z-10 mx-auto max-w-[1160px] px-5 sm:px-8 lg:px-12 py-10 sm:py-12 space-y-7">
          <div className="space-y-3">
            <Eyebrow mark="*" color="var(--a-accent)">
              One-Time Setup · Atelier
            </Eyebrow>
            <div className="flex flex-wrap items-baseline justify-between gap-4">
              <h1 className="font-display text-big font-bold text-[var(--a-ink)]">
                Prepare each room{' '}
                <span className="font-serif italic font-normal">once.</span>
              </h1>
              <span className="font-sans text-[13px] font-medium text-[var(--a-ink)]/75 tabular-nums">
                {doneCount} of {checklist.length} guides · {connectedCount} auto-publish connected
              </span>
            </div>
          </div>

          {/* Expanded Birds on a Horizon Wire */}
          {checklist.length > 0 && (
            <div
              aria-label={`${doneCount} of ${checklist.length} setup birds perched`}
              className="relative h-24 overflow-hidden"
            >
              <svg
                aria-hidden="true"
                className="absolute inset-x-0 bottom-5 h-5 w-full"
                preserveAspectRatio="none"
                viewBox="0 0 100 6"
              >
                <path
                  d="M0 3.2 C25 1.8 50 4.6 75 2.5 C88 1.9 95 3 100 2.8"
                  fill="none"
                  stroke="var(--wc-ink)"
                  strokeOpacity="0.28"
                  strokeWidth="0.7"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
              <div className="relative flex h-full items-end justify-between px-4 sm:px-10 pb-5">
                {checklist.map((item) => {
                  const perched = Boolean(item.completed);
                  return (
                    <m.img
                      key={item.step_key}
                      src={ART.bird.src}
                      alt=""
                      title={`${PLATFORM_SPECS[item.platform]?.shortName || item.platform}: ${item.label}`}
                      aria-hidden="true"
                      draggable={false}
                      animate={
                        reduce
                          ? undefined
                          : { y: perched ? 0 : -24, opacity: perched ? 1 : 0.3, scale: perched ? 1.06 : 0.85 }
                      }
                      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                      className={`wc-glaze h-10 w-10 sm:h-11 sm:w-11 ${perched ? 'opacity-100' : 'opacity-30'}`}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Single-Row Segmented Stepper Rail */}
          <div className="w-full max-w-full min-w-0 rounded-2xl border border-[var(--a-rule)] bg-[var(--a-bg)]/85 backdrop-blur-xs p-1.5">
            <div
              role="tablist"
              aria-label="Setup steps"
              className="flex flex-nowrap items-center gap-1 overflow-x-auto scroll-snap-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {STEP_TABS.map((t, idx) => {
                const active = step === t.id;
                return (
                  <button
                    key={t.id}
                    ref={(el) => {
                      tabRefs.current[t.id] = el;
                    }}
                    id={`${tabsId}-tab-${t.id}`}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    tabIndex={active ? 0 : -1}
                    onClick={() => selectStep(t.id)}
                    onKeyDown={(e) => onTabKeyDown(e, idx)}
                    className={`relative flex-none sm:flex-1 min-h-[44px] inline-flex items-center justify-center rounded-xl px-4 text-[14px] font-semibold whitespace-nowrap cursor-pointer transition-colors aria-selected:after:content-[''] aria-selected:after:absolute aria-selected:after:inset-x-4 aria-selected:after:bottom-0.5 aria-selected:after:border-b-2 aria-selected:after:border-[var(--a-accent)] aria-selected:after:z-10 ${
                      active
                        ? 'text-[var(--a-bg)]'
                        : 'text-[var(--a-ink)]/75 hover:bg-[var(--a-well)] hover:text-[var(--a-ink)]'
                    }`}
                  >
                    {active && (
                      <m.span
                        layoutId={`${tabsId}-active-step`}
                        transition={
                          reduce
                            ? { duration: 0 }
                            : { type: 'spring', stiffness: 420, damping: 34 }
                        }
                        aria-hidden="true"
                        className="absolute inset-0 rounded-xl bg-[var(--a-ink)] shadow-sm"
                      />
                    )}
                    <span className="relative z-10">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1160px] px-5 sm:px-8 lg:px-12 space-y-10">
        <AnimatePresence mode="wait" initial={false}>
          {/* Step 1: Prescriptive Account Checklist */}
          {step === 'accounts' && (
            <m.section
              key="accounts"
              role="tabpanel"
              aria-labelledby={`${tabsId}-tab-accounts`}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="grid gap-10 lg:grid-cols-12 lg:items-start"
            >
              <div className="lg:col-span-4 space-y-6">
                <div className="space-y-4">
                  <p className="font-serif italic text-lg text-[var(--a-muted)]">
                    Expand any item on the right for an exact tap-by-tap walkthrough — no developer skills needed.
                  </p>
                  <dl className="space-y-4 border-t border-[var(--a-rule)] pt-4">
                    <div className="space-y-1">
                      <dt className="font-display text-base font-bold text-[var(--a-ink)]">
                        1. Works immediately
                      </dt>
                      <dd className="text-[14px] leading-relaxed text-[var(--a-muted)]">
                        Copy &amp; Open works out of the box for all six rooms where you are already signed in.
                      </dd>
                    </div>
                    <div className="space-y-1">
                      <dt className="font-display text-base font-bold text-[var(--a-ink)]">
                        2. Clean room profiles
                      </dt>
                      <dd className="text-[14px] leading-relaxed text-[var(--a-muted)]">
                        Keep bio links, public audiences, and Creator accounts tidy so every room welcomes readers.
                      </dd>
                    </div>
                    <div className="space-y-1">
                      <dt className="font-display text-base font-bold text-[var(--a-ink)]">
                        3. 1-click transmit &amp; Nostr
                      </dt>
                      <dd className="text-[14px] leading-relaxed text-[var(--a-muted)]">
                        Connect X, Threads, Facebook Pages, and Nostr in Step 03 and group them into Audience Profiles.
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* Decorative Folon Open-Window Plate */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={ART.window.srcSmall}
                  alt={ART.window.alt}
                  className="hidden lg:block w-full max-w-[260px] wc-glaze wc-wet-edge opacity-90"
                />
              </div>

              <div className="lg:col-span-8 rounded-2xl border border-[var(--a-rule)] bg-[var(--a-well)] px-5 sm:px-7 py-2 shadow-[0_1px_0_rgba(17,24,39,0.06),0_26px_54px_-38px_rgba(42,47,69,0.22)]">
                <AccentHairlineList>
                  {checklist.map((item, idx) => {
                    const spec = PLATFORM_SPECS[item.platform];
                    const guideStep = PLATFORM_GUIDES[item.platform]?.setupSteps.find(
                      (s) => s.key === item.step_key
                    );
                    const isDone = Boolean(item.completed);
                    const openByDefault = !isDone && idx === firstIncompleteIdx;

                    return (
                      <AccentHairlineItem key={item.step_key} index={idx + 1}>
                        <div className="space-y-2.5">
                          <label
                            htmlFor={`setup-step-${item.step_key}`}
                            className="flex min-h-[44px] cursor-pointer items-start gap-3.5"
                          >
                            <input
                              id={`setup-step-${item.step_key}`}
                              type="checkbox"
                              checked={isDone}
                              onChange={() => handleToggleChecklist(item)}
                              className="mt-1 h-5 w-5 shrink-0 accent-[var(--a-accent)] cursor-pointer"
                            />
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-sans text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--a-accent-text)]">
                                  {spec?.shortName || item.platform}
                                </span>
                                <span
                                  className={`text-base font-semibold ${
                                    isDone ? 'line-through text-[var(--a-muted)]' : 'text-[var(--a-ink)]'
                                  }`}
                                >
                                  {item.label}
                                </span>
                              </div>
                              <p className="text-[15px] leading-relaxed text-[var(--a-muted)]">
                                {item.detail}
                              </p>
                            </div>
                          </label>

                          {guideStep && (
                            <details
                              open={expandedMap[item.step_key] ?? openByDefault}
                              onToggle={(e) => {
                                const isOpenNow = e.currentTarget.open;
                                setExpandedMap((prev) =>
                                  prev[item.step_key] === isOpenNow
                                    ? prev
                                    : { ...prev, [item.step_key]: isOpenNow }
                                );
                              }}
                              className="pl-8"
                            >
                              <summary className="min-h-[44px] inline-flex items-center cursor-pointer text-[13px] font-semibold text-[var(--a-accent-text)] hover:text-[var(--a-ink)]">
                                Step-by-step walkthrough
                              </summary>

                              <div className="mt-2 border-l-2 border-[var(--a-accent)]/35 bg-[var(--a-surface)]/55 px-4 py-3.5 space-y-3 text-[14px] text-[var(--a-ink)]/85">
                                <p>
                                  <strong>Why this matters:</strong> {guideStep.whyItMatters}
                                </p>
                                <ol className="list-decimal pl-5 space-y-1.5 leading-relaxed">
                                  {guideStep.howToSteps.map((howStep, stepIdx) => (
                                    <li key={stepIdx}>{howStep}</li>
                                  ))}
                                </ol>
                                {guideStep.actionUrl && (
                                  <div className="pt-1">
                                    <a
                                      href={guideStep.actionUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="wc-link inline-flex min-h-[44px] items-center font-semibold text-[var(--a-ink)]"
                                    >
                                      {guideStep.actionLabel || `Open ${spec?.shortName || 'app'} ↗`}
                                    </a>
                                  </div>
                                )}
                              </div>
                            </details>
                          )}
                        </div>
                      </AccentHairlineItem>
                    );
                  })}
                </AccentHairlineList>
              </div>
            </m.section>
          )}

          {/* Step 2: Handles & Rhythm */}
          {step === 'handles' && (
            <m.section
              key="handles"
              role="tabpanel"
              aria-labelledby={`${tabsId}-tab-handles`}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-6"
            >
              <p className="font-serif italic text-lg text-[var(--a-muted)] max-w-[64ch]">
                Your handle shapes how each room preview reads. The rhythm interval powers the quiet Header Rhythm memory — zero notifications or streak guilt.
              </p>

              <div className="rounded-2xl border border-[var(--a-rule)] bg-[var(--a-well)] px-5 sm:px-7 divide-y divide-[var(--a-rule)] shadow-[0_1px_0_rgba(17,24,39,0.06),0_26px_54px_-38px_rgba(42,47,69,0.22)]">
                {PLATFORM_ORDER.map((pid) => {
                  const spec = PLATFORM_SPECS[pid];
                  const setting = platformSettings.find((s) => s.platform === pid);
                  const connectedHandle = apiStatus?.[pid]?.handle;
                  const handleVal =
                    draftHandles[pid] !== undefined ? draftHandles[pid] : setting?.handle ?? '';
                  const cadenceVal =
                    draftCadences[pid] !== undefined
                      ? draftCadences[pid]
                      : setting?.cadence_days ?? spec.cadenceDefaultDays;

                  return (
                    <div
                      key={pid}
                      className="py-6 grid gap-5 lg:grid-cols-[200px_1fr_auto] lg:items-end"
                    >
                      <div>
                        <div className="font-display text-lg font-bold text-[var(--a-ink)]">
                          {spec.name}
                        </div>
                        <div className="font-sans text-[13px] text-[var(--a-muted)]">
                          {spec.tierLabel}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <label
                            htmlFor={`setup-handle-${pid}`}
                            className="block font-sans text-[13px] font-semibold uppercase tracking-[0.1em] text-[var(--a-muted)]"
                          >
                            Handle
                          </label>
                          {connectedHandle && connectedHandle !== handleVal && (
                            <button
                              type="button"
                              onClick={() => {
                                setDraftHandles((prev) => ({ ...prev, [pid]: connectedHandle }));
                                handleSavePlatformSetting(pid, connectedHandle, cadenceVal);
                              }}
                              className="wc-link text-[13px] font-semibold text-[var(--a-accent-text)] cursor-pointer"
                            >
                              Use connected {connectedHandle}
                            </button>
                          )}
                        </div>
                        <AccentInput
                          id={`setup-handle-${pid}`}
                          type="text"
                          value={handleVal}
                          placeholder={`@your_${pid}_handle`}
                          autoCorrect="off"
                          autoCapitalize="none"
                          spellCheck={false}
                          onChange={(e) =>
                            setDraftHandles((prev) => ({ ...prev, [pid]: e.target.value }))
                          }
                          onBlur={(e) => handleSavePlatformSetting(pid, e.target.value, cadenceVal)}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label
                          htmlFor={`setup-cadence-${pid}`}
                          className="block font-sans text-[13px] font-semibold uppercase tracking-[0.1em] text-[var(--a-muted)]"
                        >
                          Rhythm
                        </label>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {CADENCE_PRESETS.map((preset) => {
                            const active = Number(cadenceVal) === preset.days;
                            return (
                              <button
                                key={preset.days}
                                type="button"
                                onClick={() => {
                                  setDraftCadences((prev) => ({ ...prev, [pid]: preset.days }));
                                  handleSavePlatformSetting(pid, handleVal, preset.days);
                                }}
                                className={`min-h-[40px] rounded-full border px-3 text-[13px] font-medium cursor-pointer transition-colors ${
                                  active
                                    ? 'border-[var(--a-ink)] bg-[var(--a-ink)] text-white'
                                    : 'border-[var(--a-rule)] bg-[var(--a-bg)] text-[var(--a-muted)] hover:border-[var(--a-ink)] hover:text-[var(--a-ink)]'
                                }`}
                              >
                                {preset.label}
                              </button>
                            );
                          })}
                          <div className="w-20">
                            <AccentInput
                              id={`setup-cadence-${pid}`}
                              type="number"
                              min={1}
                              max={30}
                              aria-label={`${spec.name} custom interval in days`}
                              value={cadenceVal}
                              onChange={(e) =>
                                setDraftCadences((prev) => ({
                                  ...prev,
                                  [pid]: Number(e.target.value || spec.cadenceDefaultDays),
                                }))
                              }
                              onBlur={(e) =>
                                handleSavePlatformSetting(
                                  pid,
                                  handleVal,
                                  Number(e.target.value || spec.cadenceDefaultDays)
                                )
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </m.section>
          )}

          {/* Step 3: Direct OAuth Connections, Facebook Page Switcher, Nostr & Audience Profiles */}
          {step === 'publishing' && (
            <m.section
              key="publishing"
              role="tabpanel"
              aria-labelledby={`${tabsId}-tab-publishing`}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-8"
            >
              {oauthError && (
                <div className="border-l-2 border-[var(--a-accent)] bg-[var(--a-surface)] px-5 py-3.5 text-[14px] text-[var(--a-ink)]">
                  <strong className="text-[var(--a-accent-text)]">Connection error:</strong> {oauthError}
                </div>
              )}
              {connectedParam && (
                <div className="border-l-2 border-[var(--a-emerald)] bg-[var(--a-sky-surface)]/65 px-5 py-3.5 text-[14px] text-[var(--a-ink)]">
                  <strong className="text-[var(--a-emerald)]">Connected:</strong> {connectedParam} is now linked and ready to transmit.
                </div>
              )}

              <div className="rounded-2xl border border-[var(--a-rule)] bg-[var(--a-well)] p-5 sm:p-7 space-y-6 shadow-[0_1px_0_rgba(17,24,39,0.06),0_26px_54px_-38px_rgba(42,47,69,0.22)]">
                <div className="border-l-2 border-[var(--a-accent)] pl-4 space-y-1.5">
                  <h2 className="font-display text-lg font-bold text-[var(--a-ink)]">
                    Connected accounts for 1-click transmit
                  </h2>
                  <p className="text-[15px] leading-relaxed text-[var(--a-ink)]/80">
                    Authorize X, Threads, Facebook Pages, or Nostr below. Substack has no public posting API and stays ready with Copy &amp; Open.
                  </p>
                </div>

                <ul className="divide-y divide-[var(--a-rule)] border-t border-[var(--a-rule)]">
                  {PLATFORM_ORDER.map((pid) => {
                    const spec = PLATFORM_SPECS[pid];
                    const api = apiStatus?.[pid];
                    const connectHref =
                      pid === 'threads'
                        ? '/api/auth/threads/connect'
                        : pid === 'x'
                          ? '/api/auth/x/connect'
                          : pid === 'facebook' || pid === 'instagram'
                            ? '/api/auth/meta/connect'
                            : null;

                    return (
                      <li key={pid} className="flex flex-wrap items-center justify-between gap-4 py-5">
                        <div className="space-y-1.5">
                          <span className="font-display text-base font-bold text-[var(--a-ink)] block">
                            {spec.name}
                          </span>
                          <span
                            className={`block text-[13px] ${
                              api?.configured ? 'text-[var(--a-emerald)] font-medium' : 'text-[var(--a-muted)]'
                            }`}
                          >
                            {api?.note || 'Copy & Open ready'}
                          </span>

                          {pid === 'facebook' && api?.pages && api.pages.length > 1 && (
                            <div className="pt-1.5 flex flex-wrap items-center gap-2">
                              <span className="text-[13px] font-medium text-[var(--a-muted)]">
                                Active Page:
                              </span>
                              {api.pages.map((pg) => {
                                const isActivePage = api.handle === pg.name;
                                const isBusy = switchingPageId === pg.id;
                                return (
                                  <button
                                    key={pg.id}
                                    type="button"
                                    disabled={switchingPageId !== null}
                                    onClick={async () => {
                                      setSwitchingPageId(pg.id);
                                      try {
                                        await fetch('/api/auth/meta/select-page', {
                                          method: 'POST',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ pageId: pg.id }),
                                        });
                                        await refreshStudio();
                                      } finally {
                                        setSwitchingPageId(null);
                                      }
                                    }}
                                    className={`min-h-[38px] rounded-full border px-3.5 text-[13px] font-medium cursor-pointer transition-colors disabled:opacity-50 ${
                                      isActivePage
                                        ? 'border-[var(--a-ink)] bg-[var(--a-ink)] text-white'
                                        : 'border-[var(--a-rule)] bg-[var(--a-bg)] text-[var(--a-ink)] hover:border-[var(--a-accent)]'
                                    }`}
                                  >
                                    {isBusy ? 'Switching…' : pg.name}
                                    {pg.instagramHandle ? ` · IG ${pg.instagramHandle}` : ''}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2.5">
                          {connectHref ? (
                            api?.configured ? (
                              <>
                                <a
                                  href={connectHref}
                                  className="inline-flex min-h-[44px] items-center rounded-full border border-[var(--a-rule)] px-4 text-[13px] font-semibold text-[var(--a-ink)] hover:border-[var(--a-ink)] no-underline"
                                >
                                  Switch account
                                </a>
                                <button
                                  type="button"
                                  disabled={disconnectingPlatform === pid}
                                  onClick={async () => {
                                    setDisconnectingPlatform(pid);
                                    try {
                                      await fetch('/api/auth/disconnect', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ platform: pid }),
                                      });
                                      await refreshStudio();
                                    } finally {
                                      setDisconnectingPlatform(null);
                                    }
                                  }}
                                  className="min-h-[44px] rounded-full border border-[var(--a-rule)] px-4 text-[13px] font-medium text-[var(--a-muted)] hover:border-[var(--a-ink)] hover:text-[var(--a-ink)] cursor-pointer disabled:opacity-50"
                                >
                                  {disconnectingPlatform === pid ? 'Removing…' : 'Disconnect'}
                                </button>
                              </>
                            ) : (
                              <a
                                href={connectHref}
                                className="inline-flex min-h-[44px] items-center rounded-full bg-[var(--a-ink)] px-5 text-[13px] font-semibold text-white hover:opacity-90 no-underline"
                              >
                                Connect {spec.shortName}
                              </a>
                            )
                          ) : (
                            <span className="font-sans text-[13px] font-medium text-[var(--a-muted)]">
                              Copy &amp; Open
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  })}

                  {/* Persistent Hydrated Nostr (NIP-07) Row */}
                  <li className="flex flex-wrap items-center justify-between gap-4 py-5">
                    <div className="flex items-center gap-3">
                      {nostrStatus?.picture && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={nostrStatus.picture}
                          alt=""
                          className="h-9 w-9 rounded-full object-cover border border-[var(--a-rule)]"
                        />
                      )}
                      <div>
                        <span className="font-display text-base font-bold text-[var(--a-ink)] block">
                          Nostr (NIP-07)
                        </span>
                        <span
                          className={`text-[13px] ${
                            nostrError
                              ? 'text-[var(--a-accent-text)] font-medium'
                              : isNostrConnected
                                ? 'text-[var(--a-emerald)] font-medium'
                                : 'text-[var(--a-muted)]'
                          }`}
                        >
                          {nostrError
                            ? nostrError
                            : isNostrConnected
                              ? `Connected as ${displayNostrHandle}`
                              : 'Sign & broadcast via Alby, nos2x, or Flamingo extension'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      {isNostrConnected ? (
                        <>
                          <span className="inline-flex min-h-[44px] items-center rounded-full border border-[var(--a-emerald)]/40 bg-[var(--a-sky-surface)]/55 px-4 text-[13px] font-semibold text-[var(--a-ink)]">
                            Connected ✓
                          </span>
                          <button
                            type="button"
                            disabled={disconnectingPlatform === 'nostr'}
                            onClick={async () => {
                              setDisconnectingPlatform('nostr');
                              try {
                                await fetch('/api/auth/disconnect', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ platform: 'nostr' }),
                                });
                                setLocalNostrHandle(null);
                                await refreshStudio();
                              } finally {
                                setDisconnectingPlatform(null);
                              }
                            }}
                            className="min-h-[44px] rounded-full border border-[var(--a-rule)] px-4 text-[13px] font-medium text-[var(--a-muted)] hover:border-[var(--a-ink)] hover:text-[var(--a-ink)] cursor-pointer disabled:opacity-50"
                          >
                            {disconnectingPlatform === 'nostr' ? 'Removing…' : 'Disconnect'}
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={async () => {
                            setNostrError(null);
                            const res = await connectNostrExtension();
                            if (res.ok && res.handle) {
                              setLocalNostrHandle(res.handle);
                              await refreshStudio();
                            } else if (res.error) {
                              setNostrError(res.error);
                            }
                          }}
                          className="inline-flex min-h-[44px] items-center rounded-full bg-[var(--a-ink)] px-5 text-[13px] font-semibold text-white hover:opacity-90 cursor-pointer"
                        >
                          Connect Nostr
                        </button>
                      )}
                    </div>
                  </li>
                </ul>

                {/* Audience Profiles (Collections) — Zero Nested Cards */}
                <div className="border-t border-[var(--a-rule)] pt-7 space-y-5">
                  <div className="space-y-1">
                    <h3 className="font-display text-lg font-bold text-[var(--a-ink)]">
                      Audience Profiles (Collections)
                    </h3>
                    <p className="text-[14px] text-[var(--a-muted)]">
                      Group connected accounts into presets like Personal, Business, or Product so you can pick the right audience in `/app` with one tap.
                    </p>
                  </div>

                  {profiles.length > 0 && (
                    <div className="divide-y divide-[var(--a-rule)] border-y border-[var(--a-rule)]">
                      {profiles.map((prof) => {
                        const isDefault = defaultProfileId === prof.id;
                        return (
                          <div
                            key={prof.id}
                            className="flex flex-wrap items-center justify-between gap-3 py-3.5"
                          >
                            <div className="flex flex-wrap items-center gap-2.5">
                              <span className="font-display text-base font-bold text-[var(--a-ink)]">
                                {prof.name}
                              </span>
                              <div className="flex flex-wrap items-center gap-1.5">
                                {prof.platforms.map((pid) => (
                                  <span
                                    key={pid}
                                    className="rounded-full bg-[var(--a-surface)] px-2.5 py-0.5 text-[13px] font-medium text-[var(--a-ink)]/85"
                                  >
                                    {formatChannelBadge(pid)}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => toggleDefaultProfile(prof.id)}
                                className={`min-h-[38px] rounded-full border px-3.5 text-[13px] font-medium cursor-pointer transition-colors ${
                                  isDefault
                                    ? 'border-[var(--a-accent)] bg-[var(--a-accent-fill)] text-white'
                                    : 'border-[var(--a-rule)] text-[var(--a-muted)] hover:border-[var(--a-ink)] hover:text-[var(--a-ink)]'
                                }`}
                              >
                                {isDefault ? 'Default in Studio ✓' : 'Set as default'}
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  await fetch(`/api/profiles?id=${prof.id}`, { method: 'DELETE' });
                                  setProfiles((prev) => prev.filter((p) => p.id !== prof.id));
                                  if (defaultProfileId === prof.id) toggleDefaultProfile(prof.id);
                                }}
                                className="min-h-[44px] px-2 text-[13px] font-medium text-[var(--a-muted)] hover:text-[var(--a-accent-text)] cursor-pointer"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2.5 pt-1">
                    <div className="w-full sm:w-56">
                      <AccentInput
                        aria-label="New audience profile name"
                        type="text"
                        value={newProfileName}
                        onChange={(e) => setNewProfileName(e.target.value)}
                        placeholder="Profile name (e.g. Business)"
                      />
                    </div>
                    {(['x', 'threads', 'facebook', 'instagram', 'nostr'] as const).map((pid) => {
                      const active = newProfilePlatforms.includes(pid);
                      const label = pid === 'nostr' ? 'Nostr' : PLATFORM_SPECS[pid].shortName;
                      return (
                        <button
                          key={pid}
                          type="button"
                          onClick={() =>
                            setNewProfilePlatforms((prev) =>
                              prev.includes(pid) ? prev.filter((x) => x !== pid) : [...prev, pid]
                            )
                          }
                          className={`min-h-[40px] rounded-full border px-3.5 text-[13px] font-medium cursor-pointer transition-colors ${
                            active
                              ? 'border-[var(--a-ink)] bg-[var(--a-ink)] text-white'
                              : 'border-[var(--a-rule)] bg-[var(--a-bg)] text-[var(--a-muted)] hover:border-[var(--a-ink)]'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      disabled={savingProfile || !newProfileName.trim()}
                      onClick={async () => {
                        const name = newProfileName.trim();
                        if (!name || savingProfile) return;
                        setSavingProfile(true);
                        try {
                          const res = await fetch('/api/profiles', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ name, platforms: newProfilePlatforms }),
                          });
                          const data = await res.json();
                          if (data?.profile) {
                            setProfiles((prev) => [...prev, data.profile]);
                            setNewProfileName('');
                          }
                        } finally {
                          setSavingProfile(false);
                        }
                      }}
                      className="min-h-[44px] rounded-full bg-[var(--a-ink)] px-5 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-45 cursor-pointer"
                    >
                      {savingProfile ? 'Saving…' : '+ Save Profile'}
                    </button>
                  </div>
                </div>
              </div>

              <details className="border-t border-[var(--a-rule)] pt-4">
                <summary className="min-h-[44px] inline-flex items-center cursor-pointer text-[14px] font-medium text-[var(--a-muted)] hover:text-[var(--a-ink)]">
                  Developer self-hosting locally? Configure manual API keys (.env.local)
                </summary>
                <div className="mt-3 border-l-2 border-[var(--a-rule)] pl-5 py-1 space-y-2">
                  <p className="font-sans text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--a-muted)]">
                    Optional .env.local keys for self-hosted auto-publishing
                  </p>
                  <pre className="font-code text-sm leading-relaxed text-[var(--a-ink)] whitespace-pre-wrap">
{`THREADS_ACCESS_TOKEN=
THREADS_USER_ID=
X_ACCESS_TOKEN=`}
                  </pre>
                </div>
              </details>
            </m.section>
          )}
        </AnimatePresence>

        {/* Single Sovereign Primary CTA */}
        <div className="border-t border-[var(--a-rule)] pt-8 flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            disabled={isFinishing}
            onClick={finishSetup}
            {...bloomHandlers<HTMLButtonElement>()}
            className="wc-cta inline-flex min-h-[52px] items-center gap-2 rounded-full bg-[var(--a-accent-fill)] px-7 text-base font-semibold text-white shadow-[0_14px_36px_-14px_rgba(254,41,158,0.65)] disabled:opacity-50 cursor-pointer"
          >
            <span>{isFinishing ? 'Saving…' : 'Done — start writing'}</span>
            <span aria-hidden="true">→</span>
          </button>
          <span className="font-sans text-[13px] text-[var(--a-muted)]">
            Changes save automatically per room
          </span>
        </div>
      </div>
    </div>
  );
}
