'use client';

import React, { useCallback, useEffect, useId, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ClipboardCopy,
  ExternalLink,
  Plus,
  Send,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  extractLinksForThreadsReply,
  PLATFORM_GUIDES,
  PLATFORM_ORDER,
  PLATFORM_SPECS,
  splitIntoXThread,
  type CadenceStatus,
  type PlatformId,
} from '@/lib/platforms';

interface VariantRecord {
  id?: number;
  platform: PlatformId;
  body_text: string;
  reply_text: string;
  status: string;
  external_url?: string;
  published_at?: string | null;
}

interface BroadcastRecord {
  id: number;
  title: string;
  brand: string;
  seed_text: string;
  media_note: string;
  created_at: string;
  updated_at: string;
  variants: VariantRecord[];
}

interface ChecklistStep {
  id: number;
  platform: PlatformId;
  step_key: string;
  label: string;
  detail: string;
  completed: number;
}

interface PlatformSetting {
  platform: PlatformId;
  handle: string;
  cadence_days: number;
}

type ApiStatusMap = Record<PlatformId, { configured: boolean; note: string }>;

const BRAND_OPTIONS = ['CHB Studio', 'HighDraw Golf', 'Pipes / Greater', 'Personal / Notes'];

function buildEmptyVariants(): Record<PlatformId, VariantRecord> {
  return {
    x: { platform: 'x', body_text: '', reply_text: '', status: 'draft' },
    threads: { platform: 'threads', body_text: '', reply_text: '', status: 'draft' },
    instagram: { platform: 'instagram', body_text: '', reply_text: '', status: 'draft' },
    tiktok: { platform: 'tiktok', body_text: '', reply_text: '', status: 'draft' },
  };
}

export default function AsteriskStudio() {
  const formHeadingId = useId();
  const [broadcasts, setBroadcasts] = useState<BroadcastRecord[]>([]);
  const [cadence, setCadence] = useState<CadenceStatus[]>([]);
  const [checklist, setChecklist] = useState<ChecklistStep[]>([]);
  const [platformSettings, setPlatformSettings] = useState<PlatformSetting[]>([]);
  const [apiStatus, setApiStatus] = useState<ApiStatusMap | null>(null);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [activePlatform, setActivePlatform] = useState<PlatformId>('threads');
  const [viewTab, setViewTab] = useState<'compose' | 'setup'>('compose');

  const [title, setTitle] = useState('');
  const [brand, setBrand] = useState('CHB Studio');
  const [seedText, setSeedText] = useState('');
  const [mediaNote, setMediaNote] = useState('');
  const [variants, setVariants] = useState<Record<PlatformId, VariantRecord>>(buildEmptyVariants);

  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const loadStudio = useCallback(async (keepSelectionId?: number | null) => {
    const res = await fetch('/api/studio', { cache: 'no-store' });
    if (!res.ok) return;
    const data = await res.json();
    setBroadcasts(data.broadcasts || []);
    setCadence(data.cadence || []);
    setChecklist(data.setupChecklist || []);
    setPlatformSettings(data.platformSettings || []);
    setApiStatus(data.apiStatus || null);

    if (keepSelectionId !== undefined && keepSelectionId !== null) {
      const found = (data.broadcasts || []).find((b: BroadcastRecord) => b.id === keepSelectionId);
      if (found) {
        hydrateDraft(found);
      }
    }
  }, []);

  useEffect(() => {
    loadStudio().catch(() => {});
  }, [loadStudio]);

  function hydrateDraft(b: BroadcastRecord) {
    setSelectedId(b.id);
    setTitle(b.title);
    setBrand(b.brand);
    setSeedText(b.seed_text);
    setMediaNote(b.media_note || '');
    const next = buildEmptyVariants();
    for (const v of b.variants || []) {
      if (next[v.platform]) {
        next[v.platform] = { ...v };
      }
    }
    setVariants(next);
  }

  function handleNewDraft() {
    setSelectedId(null);
    setTitle('');
    setBrand('CHB Studio');
    setSeedText('');
    setMediaNote('');
    setVariants(buildEmptyVariants());
    setViewTab('compose');
    setStatusMessage('Started a fresh broadcast draft.');
  }

  function handleSyncSeedToAllPlatforms() {
    const raw = seedText.trim();
    if (!raw) {
      setStatusMessage('Write a quick core note first before syncing across platforms.');
      return;
    }

    const threadsSplit = extractLinksForThreadsReply(raw);

    setVariants((prev) => ({
      x: { ...prev.x, body_text: prev.x.body_text.trim() ? prev.x.body_text : raw },
      threads: {
        ...prev.threads,
        body_text: prev.threads.body_text.trim() ? prev.threads.body_text : threadsSplit.mainText,
        reply_text: prev.threads.reply_text.trim() ? prev.threads.reply_text : threadsSplit.replyText,
      },
      instagram: { ...prev.instagram, body_text: prev.instagram.body_text.trim() ? prev.instagram.body_text : raw },
      tiktok: {
        ...prev.tiktok,
        body_text: prev.tiktok.body_text.trim()
          ? prev.tiktok.body_text
          : raw.slice(0, 150),
      },
    }));
    setStatusMessage('Copied your seed note into empty platform tabs (no AI rewriting applied).');
  }

  function handleMoveThreadsLinksToReply() {
    const cur = variants.threads;
    const { mainText, replyText } = extractLinksForThreadsReply(cur.body_text);
    setVariants((prev) => ({
      ...prev,
      threads: {
        ...prev.threads,
        body_text: mainText,
        reply_text: replyText || prev.threads.reply_text,
      },
    }));
    setStatusMessage(
      replyText
        ? 'Moved external URL into Threads self-reply to protect main-post reach.'
        : 'No URLs found in Threads main body.'
    );
  }

  async function saveBroadcastInternal(): Promise<number | null> {
    const payload = {
      id: selectedId || undefined,
      title: title.trim() || seedText.trim().slice(0, 48) || 'Untitled Note',
      brand,
      seed_text: seedText,
      media_note: mediaNote,
      variants: PLATFORM_ORDER.map((p) => variants[p]),
    };

    const res = await fetch('/api/studio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Save failed');
    return data.id;
  }

  async function handleSaveForm(e: React.FormEvent) {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    try {
      const savedId = await saveBroadcastInternal();
      await loadStudio(savedId);
      setStatusMessage('Saved draft and all 4 platform variants.');
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Save error');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteBroadcast(id: number) {
    const res = await fetch(`/api/studio?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      if (selectedId === id) handleNewDraft();
      await loadStudio();
      setStatusMessage('Deleted draft.');
    }
  }

  async function handleCopyAndLog(platform: PlatformId, openTab: boolean) {
    const cur = variants[platform];
    const bodyText = cur.body_text.trim();
    if (!bodyText) {
      setStatusMessage(`Write your ${PLATFORM_SPECS[platform].name} post first before copying.`);
      return;
    }

    try {
      await navigator.clipboard.writeText(bodyText);
      const broadcastId = await saveBroadcastInternal();
      if (!broadcastId) return;

      const res = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          broadcastId,
          platform,
          bodyText,
          replyText: cur.reply_text,
          mode: 'copy',
        }),
      });
      const data = await res.json();
      await loadStudio(broadcastId);
      if (openTab) {
        window.open(PLATFORM_SPECS[platform].composeUrl, '_blank', 'noopener,noreferrer');
      }
      setStatusMessage(
        openTab
          ? `Copied ${PLATFORM_SPECS[platform].shortName} post & opened composer (${data.message}).`
          : `Copied ${PLATFORM_SPECS[platform].shortName} post to clipboard and logged cadence.`
      );
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Copy failed');
    }
  }

  async function handleAutoPublish(platform: PlatformId) {
    const cur = variants[platform];
    const bodyText = cur.body_text.trim();
    if (!bodyText || isPublishing) return;

    setIsPublishing(true);
    try {
      const broadcastId = await saveBroadcastInternal();
      if (!broadcastId) return;

      const res = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          broadcastId,
          platform,
          bodyText,
          replyText: cur.reply_text,
          mode: 'api',
        }),
      });
      const data = await res.json();
      await loadStudio(broadcastId);
      setStatusMessage(data.message || 'Publish check completed.');
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Auto-publish error');
    } finally {
      setIsPublishing(false);
    }
  }

  async function handleToggleChecklist(step: ChecklistStep) {
    const nextVal = !Boolean(step.completed);
    await fetch('/api/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle_step', stepKey: step.step_key, completed: nextVal }),
    });
    await loadStudio(selectedId);
  }

  async function handleSavePlatformSetting(platform: PlatformId, handle: string, cadenceDays: number) {
    await fetch('/api/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_setting', platform, handle, cadenceDays }),
    });
    await loadStudio(selectedId);
    setStatusMessage(`Updated ${PLATFORM_SPECS[platform].name} reminder settings.`);
  }

  const activeVariant = variants[activePlatform];
  const activeSpec = PLATFORM_SPECS[activePlatform];
  const activeGuide = PLATFORM_GUIDES[activePlatform];
  const activeApi = apiStatus?.[activePlatform];
  const xThreadPreview = useMemo(
    () => (activePlatform === 'x' ? splitIntoXThread(activeVariant.body_text, 280) : []),
    [activePlatform, activeVariant.body_text]
  );

  const completedSetupCount = checklist.filter((c) => c.completed).length;

  return (
    <div className="min-h-screen flex flex-col bg-[#fbf9f5] text-slate-900">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-900 font-mono text-2xl font-bold text-white"
              aria-hidden="true"
            >
              *
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-slate-900">
                asterisk
              </h1>
              <p className="text-sm text-slate-600">
                Write once, adapt cleanly, never forget Threads, IG, or TikTok
              </p>
            </div>
          </div>

          <nav aria-label="Primary" className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewTab('compose')}
              aria-pressed={viewTab === 'compose'}
              className={`rounded-md px-4 py-2 text-sm font-medium transition ${
                viewTab === 'compose'
                  ? 'bg-slate-900 text-white'
                  : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              Compose &amp; Publish
            </button>
            <button
              type="button"
              onClick={() => setViewTab('setup')}
              aria-pressed={viewTab === 'setup'}
              className={`rounded-md px-4 py-2 text-sm font-medium transition ${
                viewTab === 'setup'
                  ? 'bg-slate-900 text-white'
                  : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              Platform Guides &amp; Setup ({completedSetupCount}/{checklist.length})
            </button>
            <button
              type="button"
              onClick={handleNewDraft}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              New Note
            </button>
          </nav>
        </div>

        {/* Cadence Reminder Strip */}
        <div className="mx-auto mt-4 flex max-w-7xl flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Cadence Radar:
          </span>
          {cadence.map((c) => {
            const spec = PLATFORM_SPECS[c.platform];
            const pillColor =
              c.state === 'fresh'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : c.state === 'due'
                  ? 'border-amber-200 bg-amber-50 text-amber-800'
                  : 'border-rose-200 bg-rose-50 text-rose-800';
            return (
              <button
                key={c.platform}
                type="button"
                onClick={() => {
                  setActivePlatform(c.platform);
                  setViewTab('compose');
                }}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${pillColor}`}
              >
                <span className="font-semibold">{spec.shortName}:</span>
                <span>{c.badgeLabel}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Centralized Live Region for Actions */}
      <div
        role="status"
        aria-live="polite"
        className="mx-auto mt-3 w-full max-w-7xl px-6"
      >
        {statusMessage ? (
          <div className="rounded-md border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-medium text-sky-900">
            {statusMessage}
          </div>
        ) : null}
      </div>

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-5">
        {viewTab === 'setup' ? (
          <section className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                How Each Platform Works &amp; Profile Setup Checklist
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Complete these once so your profile picture, bio, and account types are ready—then use the Compose tab to stay consistent.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {PLATFORM_ORDER.map((pid) => {
                const spec = PLATFORM_SPECS[pid];
                const guide = PLATFORM_GUIDES[pid];
                const steps = checklist.filter((s) => s.platform === pid);
                const setting = platformSettings.find((s) => s.platform === pid);

                return (
                  <article
                    key={pid}
                    className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-slate-900">{spec.name}</h3>
                        <p className="text-sm font-medium text-slate-700">{guide.headline}</p>
                      </div>
                      <a
                        href={spec.composeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Open <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </a>
                    </div>

                    <p className="mt-3 text-sm leading-relaxed text-slate-600">{guide.howItWorks}</p>

                    <div className="mt-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        What Actually Works Here
                      </h4>
                      <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-slate-700">
                        {guide.whatWins.map((tip) => (
                          <li key={tip}>{tip}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-4 border-t border-slate-100 pt-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Setup Steps
                      </h4>
                      <div className="mt-2 space-y-2.5">
                        {steps.map((step) => (
                          <div key={step.step_key} className="flex items-start gap-2.5">
                            <input
                              type="checkbox"
                              id={`step-${step.step_key}`}
                              checked={Boolean(step.completed)}
                              onChange={() => handleToggleChecklist(step)}
                              className="mt-1 h-4 w-4 accent-slate-900"
                            />
                            <div>
                              <label
                                htmlFor={`step-${step.step_key}`}
                                className={`text-sm font-medium ${
                                  step.completed ? 'line-through text-slate-400' : 'text-slate-900'
                                }`}
                              >
                                {step.label}
                              </label>
                              <p className="text-xs text-slate-600">{step.detail}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {setting ? (
                      <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-3">
                        <div className="flex-1 min-w-[140px]">
                          <label
                            htmlFor={`handle-${pid}`}
                            className="block text-xs font-medium text-slate-600"
                          >
                            Your Handle
                          </label>
                          <input
                            id={`handle-${pid}`}
                            type="text"
                            defaultValue={setting.handle}
                            autoCorrect="off"
                            autoCapitalize="none"
                            spellCheck={false}
                            onBlur={(e) =>
                              handleSavePlatformSetting(pid, e.target.value, setting.cadence_days)
                            }
                            className="mt-1 w-full rounded border border-slate-300 px-2.5 py-1.5 text-sm"
                          />
                        </div>
                        <div className="w-28">
                          <label
                            htmlFor={`cadence-${pid}`}
                            className="block text-xs font-medium text-slate-600"
                          >
                            Remind Every (d)
                          </label>
                          <input
                            id={`cadence-${pid}`}
                            type="number"
                            min={1}
                            max={30}
                            defaultValue={setting.cadence_days}
                            onBlur={(e) =>
                              handleSavePlatformSetting(
                                pid,
                                setting.handle,
                                Number(e.target.value || spec.cadenceDefaultDays)
                              )
                            }
                            className="mt-1 w-full rounded border border-slate-300 px-2.5 py-1.5 text-sm"
                          />
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>
        ) : (
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Left Column: Seed Input + Saved Drafts */}
            <section className="space-y-5 lg:col-span-5">
              <form
                onSubmit={handleSaveForm}
                aria-labelledby={formHeadingId}
                className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h2 id={formHeadingId} className="text-base font-semibold text-slate-900">
                    1. Core Thought / Seed Draft
                  </h2>
                  <span className="text-xs text-slate-500">100% your own words</span>
                </div>

                <div>
                  <label htmlFor="broadcast-title" className="block text-sm font-medium text-slate-700">
                    Title (internal label)
                  </label>
                  <input
                    id="broadcast-title"
                    name="title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Why Founders Ship Faster Without Agency Handoff"
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="broadcast-brand" className="block text-sm font-medium text-slate-700">
                    Brand / Topic
                  </label>
                  <select
                    id="broadcast-brand"
                    name="brand"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    {BRAND_OPTIONS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="broadcast-seed" className="block text-sm font-medium text-slate-700">
                    Raw Note (or paste from Gemini web)
                  </label>
                  <textarea
                    id="broadcast-seed"
                    name="seed_text"
                    rows={5}
                    value={seedText}
                    onChange={(e) => setSeedText(e.target.value)}
                    placeholder="Write your raw idea here, then click Sync to copy into each platform tab for quick edits..."
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm leading-relaxed"
                  />
                </div>

                <div>
                  <label htmlFor="broadcast-media" className="block text-sm font-medium text-slate-700">
                    Media / Clip Reminder (for IG &amp; TikTok)
                  </label>
                  <input
                    id="broadcast-media"
                    name="media_note"
                    type="text"
                    value={mediaNote}
                    onChange={(e) => setMediaNote(e.target.value)}
                    placeholder="e.g. 15s QuickTime before/after clip or Figma screenshot"
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleSyncSeedToAllPlatforms}
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100"
                  >
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                    Copy Seed to Empty Tabs
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    {isSaving ? 'Saving...' : 'Save Draft'}
                  </button>
                </div>
              </form>

              {/* Saved Broadcasts List */}
              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Saved Notes ({broadcasts.length})
                </h2>
                {broadcasts.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-500">
                    No saved drafts yet. Write one above and click Save Draft.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {broadcasts.map((b) => (
                      <li
                        key={b.id}
                        className={`flex items-center justify-between gap-2 rounded-md border p-2.5 ${
                          selectedId === b.id
                            ? 'border-slate-900 bg-slate-50'
                            : 'border-slate-200 bg-white'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => hydrateDraft(b)}
                          className="flex-1 text-left"
                        >
                          <div className="text-sm font-medium text-slate-900">{b.title}</div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                            <span>{b.brand}</span>
                            <span>·</span>
                            {b.variants
                              .filter((v) => v.published_at)
                              .map((v) => (
                                <span
                                  key={v.platform}
                                  className="inline-flex items-center gap-0.5 rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700"
                                >
                                  <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                                  {PLATFORM_SPECS[v.platform]?.shortName || v.platform}
                                </span>
                              ))}
                          </div>
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete ${b.title}`}
                          onClick={() => handleDeleteBroadcast(b.id)}
                          className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            {/* Right Column: Platform Variant Editor + Live Guide */}
            <section className="space-y-5 lg:col-span-7">
              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex flex-wrap gap-1.5" role="group" aria-label="Target Platform">
                    {PLATFORM_ORDER.map((pid) => {
                      const spec = PLATFORM_SPECS[pid];
                      const variantState = variants[pid];
                      const isPosted = Boolean(variantState?.published_at);
                      return (
                        <button
                          key={pid}
                          type="button"
                          aria-pressed={activePlatform === pid}
                          onClick={() => setActivePlatform(pid)}
                          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                            activePlatform === pid
                              ? 'bg-slate-900 text-white'
                              : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span>{spec.name}</span>
                          {isPosted ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>

                  <span
                    className={`font-mono text-xs font-medium ${
                      activeVariant.body_text.length > activeSpec.charLimit
                        ? 'text-rose-600'
                        : 'text-slate-500'
                    }`}
                  >
                    {activeVariant.body_text.length} / {activeSpec.charLimit} chars
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor={`variant-body-${activePlatform}`}
                      className="block text-sm font-medium text-slate-800"
                    >
                      {activeSpec.name} Post Copy
                    </label>
                    <span className="text-xs text-slate-500">{activeSpec.mediaRequirement}</span>
                  </div>
                  <textarea
                    id={`variant-body-${activePlatform}`}
                    rows={7}
                    value={activeVariant.body_text}
                    onChange={(e) =>
                      setVariants((prev) => ({
                        ...prev,
                        [activePlatform]: {
                          ...prev[activePlatform],
                          body_text: e.target.value,
                        },
                      }))
                    }
                    placeholder={`Write or refine your ${activeSpec.name} copy here...`}
                    className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm leading-relaxed"
                  />
                </div>

                {activePlatform === 'threads' ? (
                  <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <label
                        htmlFor="threads-reply-box"
                        className="text-xs font-semibold uppercase tracking-wide text-slate-600"
                      >
                        Threads Self-Reply (Put Links Here Instead of Main Post)
                      </label>
                      <button
                        type="button"
                        onClick={handleMoveThreadsLinksToReply}
                        className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                      >
                        Move URLs to Reply
                      </button>
                    </div>
                    <input
                      id="threads-reply-box"
                      type="text"
                      value={activeVariant.reply_text}
                      onChange={(e) =>
                        setVariants((prev) => ({
                          ...prev,
                          threads: { ...prev.threads, reply_text: e.target.value },
                        }))
                      }
                      placeholder="Optional reply with colonhyphenbracket.pink or pipes.pink link"
                      className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-sm"
                    />
                  </div>
                ) : null}

                {activePlatform === 'x' && xThreadPreview.length > 1 ? (
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                      X Auto-Thread Preview ({xThreadPreview.length} tweets)
                    </p>
                    <ol className="mt-2 space-y-2">
                      {xThreadPreview.map((tweet, idx) => (
                        <li
                          key={idx}
                          className="rounded border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                        >
                          {tweet}
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : null}

                {/* Publish / Copy Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyAndLog(activePlatform, true)}
                      className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                    >
                      <ClipboardCopy className="h-4 w-4" aria-hidden="true" />
                      Copy &amp; Open {activeSpec.shortName}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyAndLog(activePlatform, false)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Copy Only &amp; Log
                    </button>
                    {activeApi?.configured ? (
                      <button
                        type="button"
                        disabled={isPublishing}
                        onClick={() => handleAutoPublish(activePlatform)}
                        className="inline-flex items-center gap-1.5 rounded-md bg-sky-700 px-3 py-2 text-sm font-medium text-white hover:bg-sky-800 disabled:opacity-60"
                      >
                        <Send className="h-4 w-4" aria-hidden="true" />
                        Auto-Publish API
                      </button>
                    ) : null}
                  </div>

                  <span className="text-xs text-slate-500">
                    {activeApi?.note || 'Copy-ready workflow'}
                  </span>
                </div>
              </div>

              {/* Contextual Platform Quick-Guide */}
              <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs">
                <h3 className="text-sm font-semibold text-slate-900">
                  Quick Guide: {activeSpec.name}
                </h3>
                <p className="mt-1 text-sm text-slate-600">{activeGuide.howItWorks}</p>
                <ul className="mt-2.5 list-disc space-y-1 pl-5 text-sm text-slate-700">
                  {activeGuide.whatWins.map((tip) => (
                    <li key={tip}>{tip}</li>
                  ))}
                </ul>
              </aside>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
