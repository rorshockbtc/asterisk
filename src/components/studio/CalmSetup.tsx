'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { m, useReducedMotion } from 'framer-motion';
import { AccentHairlineItem, AccentHairlineList, AccentInput, Eyebrow } from 'accent-ui';
import { useStudio } from '@/components/studio/StudioContext';
import { bloomHandlers } from '@/art/bloom';
import { ART } from '@/lib/art-direction';
import { connectNostrExtension } from '@/lib/nostr-client';
import { PLATFORM_GUIDES, PLATFORM_ORDER, PLATFORM_SPECS } from '@/lib/platforms';

type SetupStep = 'accounts' | 'handles' | 'publishing';

const STEP_TABS: { id: SetupStep; label: string }[] = [
  { id: 'accounts', label: '01 · Accounts' },
  { id: 'handles', label: '02 · Handles & Rhythm' },
  { id: 'publishing', label: '03 · Auto-Publishing' },
];

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
    handleToggleChecklist,
    handleSavePlatformSetting,
  } = useStudio();

  const [step, setStep] = useState<SetupStep>(initialTab);
  const [draftHandles, setDraftHandles] = useState<Record<string, string>>({});
  const [draftCadences, setDraftCadences] = useState<Record<string, number>>({});
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});
  const [isFinishing, setIsFinishing] = useState(false);
  const [nostrHandle, setNostrHandle] = useState<string | null>(null);
  const [nostrError, setNostrError] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Array<{ id: number; name: string; platforms: string[] }>>([]);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfilePlatforms, setNewProfilePlatforms] = useState<string[]>(['x', 'threads']);

  useEffect(() => {
    fetch('/api/profiles')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.profiles) setProfiles(d.profiles);
      })
      .catch(() => {});
  }, []);

  const doneCount = checklist.filter((c) => c.completed).length;
  const firstIncompleteIdx = checklist.findIndex((c) => !c.completed);

  function selectStep(next: SetupStep, focus = false) {
    setStep(next);
    const el = tabRefs.current[next];
    if (el) {
      if (focus) el.focus();
      el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
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

  return (
    <div className="mx-auto max-w-[54rem] px-5 sm:px-8 py-10 sm:py-14 space-y-10">
      {/* Header + Birds on a Wire progress stage */}
      <header className="space-y-6">
        <Eyebrow mark="*" color="var(--a-accent)">
          One-Time Setup
        </Eyebrow>
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h1 className="font-display text-big font-bold text-[var(--a-ink)]">
            Prepare each room{' '}
            <span className="font-serif italic font-normal">once.</span>
          </h1>
          <span className="font-sans text-[13px] font-medium text-[var(--a-muted)] tabular-nums">
            {doneCount} of {checklist.length} ready
          </span>
        </div>

        {/* Prominent top-level segmented tabs */}
        <div
          role="tablist"
          aria-label="Setup steps"
          className="inline-flex flex-wrap gap-2 rounded-2xl border border-[var(--a-rule)] bg-[var(--a-surface)] p-1.5"
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
                className={`min-h-[40px] rounded-xl px-4 text-sm font-medium whitespace-nowrap cursor-pointer transition-colors ${
                  active
                    ? 'bg-[var(--a-ink)] text-white font-semibold shadow-sm'
                    : 'text-[var(--a-muted)] hover:text-[var(--a-ink)]'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Plain-English overview for non-technical creators */}
        <dl className="grid gap-6 border-t border-[var(--a-rule)] pt-6 sm:grid-cols-3">
          <div className="space-y-1">
            <dt className="font-display text-base font-bold text-[var(--a-ink)]">
              1. Works immediately
            </dt>
            <dd className="text-[14px] leading-relaxed text-[var(--a-muted)]">
              You don&apos;t need any developer setup to write, copy, and paste into apps where you&apos;re already signed in.
            </dd>
          </div>
          <div className="space-y-1">
            <dt className="font-display text-base font-bold text-[var(--a-ink)]">
              2. Clean profiles
            </dt>
            <dd className="text-[14px] leading-relaxed text-[var(--a-muted)]">
              Use the tap-by-tap guides in Step 01 below so bio links, public audiences, and Creator accounts are in order.
            </dd>
          </div>
          <div className="space-y-1">
            <dt className="font-display text-base font-bold text-[var(--a-ink)]">
              3. Optional 1-click post
            </dt>
            <dd className="text-[14px] leading-relaxed text-[var(--a-muted)]">
              When ready for automatic posting on Threads and X, connect your accounts through Pipes in Step 03.
            </dd>
          </div>
        </dl>

        {/* Birds landing on a horizon wire as setup completes */}
        {checklist.length > 0 && (
          <div
            aria-label={`${doneCount} of ${checklist.length} setup birds perched`}
            className="relative h-20 overflow-hidden"
          >
            <svg
              aria-hidden="true"
              className="absolute inset-x-0 bottom-4 h-4 w-full"
              preserveAspectRatio="none"
              viewBox="0 0 100 6"
            >
              <path
                d="M0 3.2 C25 1.8 50 4.6 75 2.5 C88 1.9 95 3 100 2.8"
                fill="none"
                stroke="var(--wc-ink)"
                strokeOpacity="0.24"
                strokeWidth="0.7"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            <div className="relative flex h-full items-end justify-between px-4 sm:px-8 pb-4">
              {checklist.map((item) => {
                const perched = Boolean(item.completed);
                return (
                  <m.img
                    key={item.step_key}
                    src={ART.bird.src}
                    alt=""
                    aria-hidden="true"
                    draggable={false}
                    animate={
                      reduce
                        ? undefined
                        : { y: perched ? 0 : -22, opacity: perched ? 1 : 0.28, scale: perched ? 1.05 : 0.85 }
                    }
                    transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                    className={`wc-glaze h-9 w-9 ${perched ? 'opacity-100' : 'opacity-30'}`}
                  />
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* Step 1: Prescriptive Account Checklist */}
      {step === 'accounts' && (
        <section role="tabpanel" aria-labelledby={`${tabsId}-tab-accounts`} className="space-y-6">
          <p className="font-serif italic text-lg text-[var(--a-muted)]">
            Expand any item below for an exact tap-by-tap walkthrough—no developer skills needed.
          </p>

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
                    {/* Keep <label> around checkbox + heading ONLY so expanding walkthrough never toggles checkbox */}
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
                        className="pl-8.5"
                      >
                        <summary className="min-h-[38px] inline-flex items-center cursor-pointer text-[13px] font-semibold text-[var(--a-accent-text)] hover:text-[var(--a-ink)]">
                          Step-by-step walkthrough
                        </summary>

                        <div className="mt-2 rounded-xl bg-[var(--a-surface)] px-4 py-3.5 space-y-3 text-[14px] text-[var(--a-ink)]/85">
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
                                className="wc-link inline-flex min-h-[36px] items-center font-semibold text-[var(--a-ink)]"
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
        </section>
      )}

      {/* Step 2: Handles & Rhythm */}
      {step === 'handles' && (
        <section role="tabpanel" aria-labelledby={`${tabsId}-tab-handles`} className="space-y-6">
          <p className="font-serif italic text-lg text-[var(--a-muted)]">
            Adding your handle updates the preview sheet with how your post will read. The day count only powers the calm Header Rhythm popover—nothing sends reminders or nags.
          </p>

          <div className="divide-y divide-[var(--a-rule)] border-y border-[var(--a-rule)]">
            {PLATFORM_ORDER.map((pid) => {
              const spec = PLATFORM_SPECS[pid];
              const setting = platformSettings.find((s) => s.platform === pid);
              const handleVal =
                draftHandles[pid] !== undefined ? draftHandles[pid] : setting?.handle ?? '';
              const cadenceVal =
                draftCadences[pid] !== undefined
                  ? draftCadences[pid]
                  : setting?.cadence_days ?? spec.cadenceDefaultDays;

              return (
                <div
                  key={pid}
                  className="py-5 grid gap-4 sm:grid-cols-[180px_1fr_110px] sm:items-end"
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
                    <label
                      htmlFor={`setup-handle-${pid}`}
                      className="block font-sans text-[13px] font-semibold uppercase tracking-[0.1em] text-[var(--a-muted)]"
                    >
                      Handle
                    </label>
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
                      Every (d)
                    </label>
                    <AccentInput
                      id={`setup-cadence-${pid}`}
                      type="number"
                      min={1}
                      max={30}
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
              );
            })}
          </div>
        </section>
      )}

      {/* Step 3: Direct OAuth Connections + Multi-platform Auto-Publishing */}
      {step === 'publishing' && (
        <section role="tabpanel" aria-labelledby={`${tabsId}-tab-publishing`} className="space-y-6">
          {oauthError && (
            <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-[14px] text-red-900">
              <strong>Connection error:</strong> {oauthError}
            </div>
          )}
          {connectedParam && (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-[14px] text-emerald-900">
              <strong>Connected:</strong> {connectedParam} is now linked and ready to publish.
            </div>
          )}
          <div className="border-l-2 border-[var(--a-accent)] bg-[var(--a-surface)] px-5 py-4 space-y-2">
            <h2 className="font-display text-lg font-bold text-[var(--a-ink)]">
              Connect your social accounts for 1-click publishing
            </h2>
            <p className="text-[15px] leading-relaxed text-[var(--a-ink)]/80">
              Connect Threads, X, Facebook Page, or Instagram below. Once connected, you can select
              one or multiple platforms in the studio and transmit directly.
            </p>
            <p className="text-[14px] text-[var(--a-muted)]">
              Substack has no public posting API, so it continues to use <strong>Copy &amp; Open</strong>.
            </p>
          </div>

          <ul className="divide-y divide-[var(--a-rule)] border-y border-[var(--a-rule)]">
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
                <li key={pid} className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div>
                    <span className="font-display text-base font-bold text-[var(--a-ink)] block">
                      {spec.name}
                    </span>
                    <span
                      className={`text-[13px] ${
                        api?.configured ? 'text-[var(--a-emerald)] font-medium' : 'text-[var(--a-muted)]'
                      }`}
                    >
                      {api?.note || 'Copy & Open ready'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {connectHref ? (
                      api?.configured ? (
                        <>
                          <a
                            href={connectHref}
                            className="inline-flex min-h-[38px] items-center rounded-full border border-[var(--a-rule)] px-4 text-[13px] font-medium text-[var(--a-ink)] hover:border-[var(--a-ink)] no-underline"
                          >
                            Switch
                          </a>
                          <button
                            type="button"
                            onClick={async () => {
                              await fetch('/api/auth/disconnect', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ platform: pid }),
                              });
                              window.location.reload();
                            }}
                            className="min-h-[38px] rounded-full border border-[var(--a-rule)] px-4 text-[13px] font-medium text-[var(--a-muted)] hover:border-[var(--a-ink)] hover:text-[var(--a-ink)] cursor-pointer"
                          >
                            Disconnect
                          </button>
                        </>
                      ) : (
                        <a
                          href={connectHref}
                          className="inline-flex min-h-[38px] items-center rounded-full bg-[var(--a-ink)] px-4 text-[13px] font-semibold text-white hover:opacity-90 no-underline"
                        >
                          Connect {spec.shortName}
                        </a>
                      )
                    ) : (
                      <span className="font-sans text-[13px] text-[var(--a-muted)]">
                        Copy &amp; Open
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
            <li className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div>
                <span className="font-display text-base font-bold text-[var(--a-ink)] block">
                  Nostr (NIP-07)
                </span>
                <span
                  className={`text-[13px] ${
                    nostrHandle ? 'text-[var(--a-emerald)] font-medium' : 'text-[var(--a-muted)]'
                  }`}
                >
                  {nostrError
                    ? nostrError
                    : nostrHandle
                      ? `Connected: ${nostrHandle}`
                      : 'Sign & publish via Alby, nos2x, or Flamingo browser extension'}
                </span>
              </div>
              <button
                type="button"
                onClick={async () => {
                  setNostrError(null);
                  const res = await connectNostrExtension();
                  if (res.ok && res.handle) {
                    setNostrHandle(res.handle);
                  } else if (res.error) {
                    setNostrError(res.error);
                  }
                }}
                className="inline-flex min-h-[38px] items-center rounded-full bg-[var(--a-ink)] px-4 text-[13px] font-semibold text-white hover:opacity-90 cursor-pointer"
              >
                {nostrHandle ? 'Reconnect Nostr' : 'Connect Nostr'}
              </button>
            </li>
          </ul>

          {/* Publishing Profiles (Collections: Personal, Business, Product, etc.) */}
          <div className="rounded-2xl border border-[var(--a-rule)] bg-[var(--a-surface)] p-5 space-y-4">
            <div>
              <h3 className="font-display text-base font-bold text-[var(--a-ink)]">
                Publishing Profiles (Collections)
              </h3>
              <p className="text-[13px] text-[var(--a-muted)]">
                Group channels into presets like Personal, Business, or Product so you can switch audiences in 1 click.
              </p>
            </div>

            {profiles.length > 0 && (
              <div className="divide-y divide-[var(--a-rule)] border-y border-[var(--a-rule)]">
                {profiles.map((prof) => (
                  <div key={prof.id} className="flex items-center justify-between gap-3 py-2.5 text-[14px]">
                    <div>
                      <span className="font-semibold text-[var(--a-ink)]">{prof.name}</span>
                      <span className="ml-2 text-[12px] text-[var(--a-muted)]">
                        ({prof.platforms.join(', ') || 'no channels'})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        await fetch(`/api/profiles?id=${prof.id}`, { method: 'DELETE' });
                        setProfiles((prev) => prev.filter((p) => p.id !== prof.id));
                      }}
                      className="text-[12px] text-[var(--a-muted)] hover:text-red-600 cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                placeholder="Profile name (e.g. Business)"
                className="min-h-[38px] rounded-xl border border-[var(--a-rule)] bg-[var(--a-bg)] px-3 text-[13px] text-[var(--a-ink)]"
              />
              {(['x', 'threads', 'facebook', 'instagram', 'nostr'] as const).map((pid) => {
                const active = newProfilePlatforms.includes(pid);
                return (
                  <button
                    key={pid}
                    type="button"
                    onClick={() =>
                      setNewProfilePlatforms((prev) =>
                        prev.includes(pid) ? prev.filter((x) => x !== pid) : [...prev, pid]
                      )
                    }
                    className={`min-h-[32px] rounded-full border px-3 text-[12px] font-medium cursor-pointer ${
                      active
                        ? 'border-[var(--a-ink)] bg-[var(--a-ink)] text-white'
                        : 'border-[var(--a-rule)] text-[var(--a-muted)]'
                    }`}
                  >
                    {pid}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={async () => {
                  const name = newProfileName.trim();
                  if (!name) return;
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
                }}
                className="min-h-[38px] rounded-full bg-[var(--a-ink)] px-4 text-[13px] font-semibold text-white cursor-pointer"
              >
                + Add Profile
              </button>
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
        </section>
      )}

      {/* Single Primary CTA */}
      <div className="border-t border-[var(--a-rule)] pt-8">
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
      </div>
    </div>
  );
}
