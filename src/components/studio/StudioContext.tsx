'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  adaptSeedToPlatform,
  extractLinksForThreadsReply,
  MAX_MEDIA_IMAGES,
  PLATFORM_ORDER,
  PLATFORM_SPECS,
  TOPIC_OPTIONS,
  type CadenceStatus,
  type MediaAttachment,
  type PlatformId,
} from '@/lib/platforms';
import {
  adaptInboundFromPipes,
  buildHashDraftUrl,
  fetchPipesSession,
  saveDraftToPipes,
  type PipesSessionPayload,
} from '@/lib/pipes-client';
import { PIPES_SIGNUP_URL } from '@/lib/session';
import type {
  ApiStatusMap,
  BroadcastRecord,
  ChecklistStep,
  PlatformSetting,
  StudioHydrationPayload,
  VariantRecord,
} from '@/lib/studio-types';

export interface StatusLink {
  label: string;
  href: string;
}

export interface InboundSourceMeta {
  sourceTitle?: string;
  sourceUrl?: string;
  pipe?: string;
}

function buildEmptyVariants(): Record<PlatformId, VariantRecord> {
  return {
    threads: { platform: 'threads', body_text: '', reply_text: '', status: 'draft' },
    x: { platform: 'x', body_text: '', reply_text: '', status: 'draft' },
    facebook: { platform: 'facebook', body_text: '', reply_text: '', status: 'draft' },
    substack: { platform: 'substack', body_text: '', reply_text: '', status: 'draft' },
    instagram: { platform: 'instagram', body_text: '', reply_text: '', status: 'draft' },
    tiktok: { platform: 'tiktok', body_text: '', reply_text: '', status: 'draft' },
  };
}

interface StudioContextValue {
  broadcasts: BroadcastRecord[];
  cadence: CadenceStatus[];
  checklist: ChecklistStep[];
  platformSettings: PlatformSetting[];
  apiStatus: ApiStatusMap | null;
  pipesSession: PipesSessionPayload | null;
  selectedId: number | null;
  activePlatform: PlatformId;
  setActivePlatform: (p: PlatformId) => void;
  title: string;
  setTitle: (v: string) => void;
  brand: string;
  setBrand: (v: string) => void;
  seedText: string;
  updateSeedText: (v: string) => void;
  mediaNote: string;
  setMediaNote: (v: string) => void;
  attachments: MediaAttachment[];
  setAttachments: (next: MediaAttachment[]) => void;
  variants: Record<PlatformId, VariantRecord>;
  customized: Partial<Record<PlatformId, boolean>>;
  updateVariantBody: (p: PlatformId, v: string) => void;
  updateVariantReply: (p: PlatformId, v: string) => void;
  resetPlatformToSeed: (p: PlatformId) => void;
  inboundSource: InboundSourceMeta | null;
  applyInboundFromPipes: (params: {
    draft?: string;
    sourceTitle?: string;
    sourceUrl?: string;
    pipe?: string;
  }) => void;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  isSaving: boolean;
  isPublishing: boolean;
  isPublishingPipe: boolean;
  statusMessage: string;
  setStatusMessage: (msg: string) => void;
  statusLinks: StatusLink[];
  setStatusLinks: (links: StatusLink[]) => void;
  handleNewNote: () => void;
  handleHydrateBroadcast: (b: BroadcastRecord) => void;
  handleSaveDraft: () => Promise<number | null>;
  handlePublishToPersonalPipe: (extensionNote?: string) => Promise<boolean>;
  handleDeleteBroadcast: (id: number) => Promise<void>;
  handleMoveLinksToReply: (p: PlatformId) => void;
  handleCopyReplyOnly: (p: PlatformId) => Promise<void>;
  handleCopyAndLog: (p: PlatformId, openTab: boolean) => Promise<boolean>;
  handleAutoPublish: (p: PlatformId) => Promise<boolean>;
  handleAutoPublishMany: (platforms: PlatformId[]) => Promise<void>;
  handleToggleChecklist: (step: ChecklistStep) => Promise<void>;
  handleSavePlatformSetting: (p: PlatformId, handle: string, cadenceDays: number) => Promise<void>;
}

const StudioContext = createContext<StudioContextValue | null>(null);

export function useStudio() {
  const ctx = useContext(StudioContext);
  if (!ctx) throw new Error('useStudio must be used inside StudioProvider');
  return ctx;
}

export function StudioProvider({ children }: { children: React.ReactNode }) {
  const [broadcasts, setBroadcasts] = useState<BroadcastRecord[]>([]);
  const [cadence, setCadence] = useState<CadenceStatus[]>([]);
  const [checklist, setChecklist] = useState<ChecklistStep[]>([]);
  const [platformSettings, setPlatformSettings] = useState<PlatformSetting[]>([]);
  const [apiStatus, setApiStatus] = useState<ApiStatusMap | null>(null);
  const [pipesSession, setPipesSession] = useState<PipesSessionPayload | null>(null);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [activePlatform, setActivePlatform] = useState<PlatformId>('threads');
  const [title, setTitle] = useState('');
  const [brand, setBrand] = useState<string>(TOPIC_OPTIONS[0]);
  const [seedText, setSeedText] = useState('');
  const [mediaNote, setMediaNote] = useState('');
  const [attachments, setAttachments] = useState<MediaAttachment[]>([]);
  const [variants, setVariants] = useState<Record<PlatformId, VariantRecord>>(buildEmptyVariants);
  const [customized, setCustomized] = useState<Partial<Record<PlatformId, boolean>>>({});
  const [inboundSource, setInboundSource] = useState<InboundSourceMeta | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isPublishingPipe, setIsPublishingPipe] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusLinks, setStatusLinks] = useState<StatusLink[]>([]);

  const handleHydrateBroadcast = useCallback((b: BroadcastRecord) => {
    setSelectedId(b.id);
    setTitle(b.title);
    setBrand(b.brand || TOPIC_OPTIONS[0]);
    setSeedText(b.seed_text);
    setMediaNote(b.media_note || '');
    setAttachments(
      Array.isArray(b.media_attachments) ? b.media_attachments.slice(0, MAX_MEDIA_IMAGES) : []
    );
    setInboundSource(null);

    const next = buildEmptyVariants();
    const customFlags: Partial<Record<PlatformId, boolean>> = {};
    for (const v of b.variants || []) {
      if (next[v.platform]) {
        next[v.platform] = { ...v };
        if (v.body_text.trim()) {
          customFlags[v.platform] = true;
        }
      }
    }
    setVariants(next);
    setCustomized(customFlags);
  }, []);

  const refreshStudio = useCallback(
    async (keepSelectionId?: number | null) => {
      const res = await fetch('/api/studio', { cache: 'no-store' });
      if (!res.ok) return;
      const data = (await res.json()) as StudioHydrationPayload;
      setBroadcasts(data.broadcasts || []);
      setCadence(data.cadence || []);
      setChecklist(data.setupChecklist || []);
      setPlatformSettings(data.platformSettings || []);
      setApiStatus(data.apiStatus || null);

      if (keepSelectionId !== undefined && keepSelectionId !== null) {
        const found = (data.broadcasts || []).find((b) => b.id === keepSelectionId);
        if (found) handleHydrateBroadcast(found);
      }
    },
    [handleHydrateBroadcast]
  );

  useEffect(() => {
    let active = true;
    fetch('/api/studio', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: StudioHydrationPayload | null) => {
        if (!active || !data) return;
        setBroadcasts(data.broadcasts || []);
        setCadence(data.cadence || []);
        setChecklist(data.setupChecklist || []);
        setPlatformSettings(data.platformSettings || []);
        setApiStatus(data.apiStatus || null);
      })
      .catch(() => {});

    fetchPipesSession().then((session) => {
      if (active && session) setPipesSession(session);
    });

    return () => {
      active = false;
    };
  }, []);

  const updateSeedText = useCallback(
    (nextSeed: string) => {
      setSeedText(nextSeed);
      setVariants((prev) => {
        const next = { ...prev };
        for (const pid of PLATFORM_ORDER) {
          if (!customized[pid]) {
            const adapted = adaptSeedToPlatform(pid, nextSeed);
            next[pid] = {
              ...prev[pid],
              body_text: adapted.bodyText,
              reply_text: adapted.replyText,
            };
          }
        }
        return next;
      });
    },
    [customized]
  );

  const applyInboundFromPipes = useCallback(
    (params: { draft?: string; sourceTitle?: string; sourceUrl?: string; pipe?: string }) => {
      const hydrated = adaptInboundFromPipes(params);
      setSelectedId(null);
      setTitle(hydrated.title);
      setSeedText(hydrated.seedText);
      setVariants(hydrated.variants);
      setCustomized({});
      setInboundSource({
        sourceTitle: params.sourceTitle,
        sourceUrl: params.sourceUrl,
        pipe: params.pipe,
      });
      setStatusLinks([]);
      setStatusMessage(
        params.pipe
          ? `Loaded draft from pipe\\${params.pipe} into all six rooms.`
          : 'Loaded draft from Pipes into all six rooms.'
      );
    },
    []
  );

  const updateVariantBody = useCallback((p: PlatformId, v: string) => {
    setCustomized((prev) => ({ ...prev, [p]: true }));
    setVariants((prev) => ({
      ...prev,
      [p]: { ...prev[p], body_text: v },
    }));
  }, []);

  const updateVariantReply = useCallback((p: PlatformId, v: string) => {
    setCustomized((prev) => ({ ...prev, [p]: true }));
    setVariants((prev) => ({
      ...prev,
      [p]: { ...prev[p], reply_text: v },
    }));
  }, []);

  const resetPlatformToSeed = useCallback(
    (p: PlatformId) => {
      setCustomized((prev) => {
        const next = { ...prev };
        delete next[p];
        return next;
      });
      const adapted = adaptSeedToPlatform(p, seedText);
      setVariants((prev) => ({
        ...prev,
        [p]: { ...prev[p], body_text: adapted.bodyText, reply_text: adapted.replyText },
      }));
      setStatusLinks([]);
      setStatusMessage(`Synced ${PLATFORM_SPECS[p].shortName} back to your core thought.`);
    },
    [seedText]
  );

  const handleNewNote = useCallback(() => {
    setSelectedId(null);
    setTitle('');
    setBrand(TOPIC_OPTIONS[0]);
    setSeedText('');
    setMediaNote('');
    setAttachments([]);
    setInboundSource(null);
    setVariants(buildEmptyVariants());
    setCustomized({});
    setStatusLinks([]);
    setStatusMessage('Blank page ready.');
  }, []);

  const saveBroadcastInternal = useCallback(async (): Promise<number | null> => {
    const payload = {
      id: selectedId || undefined,
      title: title.trim() || seedText.trim().slice(0, 48) || 'Untitled Note',
      brand,
      seed_text: seedText,
      media_note: mediaNote,
      media_attachments: attachments.slice(0, MAX_MEDIA_IMAGES),
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
  }, [attachments, brand, mediaNote, seedText, selectedId, title, variants]);

  const activeChannelsPayload = useCallback(
    () => PLATFORM_ORDER.filter((p) => variants[p].body_text.trim().length > 0),
    [variants]
  );

  const handleSaveDraft = useCallback(async () => {
    if (isSaving) return null;
    setIsSaving(true);
    try {
      const effectiveTitle = title.trim() || seedText.trim().slice(0, 48) || 'Untitled Note';
      const localPayload = {
        id: selectedId || undefined,
        title: effectiveTitle,
        topic: brand,
        seedText,
        mediaNote,
        media_attachments: attachments.slice(0, MAX_MEDIA_IMAGES),
        variants: PLATFORM_ORDER.map((p) => variants[p]),
      };
      const localRes = await fetch('/api/hash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(localPayload),
      });
      const localData = await localRes.json();
      if (!localRes.ok) throw new Error(localData.error || 'Save to Hash failed');
      const savedId = Number(localData.id);
      await refreshStudio(savedId);

      // Sync upstream to pipes.pink /api/hash/entries when signed in
      const pipesRes = await saveDraftToPipes({
        title: effectiveTitle,
        content: seedText,
        writingMode: 'quick',
        source: 'asterisk',
        channels: activeChannelsPayload(),
        publishToPersonalPipe: false,
        sourceTitle: inboundSource?.sourceTitle,
        sourceUrl: inboundSource?.sourceUrl,
        tags: [brand],
      });

      if (pipesRes.ok) {
        setStatusMessage('Saved to # Hash.');
        setStatusLinks([{ label: 'Extend in # Hash ↗', href: pipesRes.data.extendInHashUrl }]);
      } else if (pipesRes.needsAuth) {
        setStatusMessage('Saved locally — sign in on Pipes to sync directly to Hash.');
        setStatusLinks([
          { label: 'Sign in on Pipes ↗', href: pipesRes.loginUrl },
          { label: 'Open draft in # Hash ↗', href: buildHashDraftUrl(effectiveTitle, seedText) },
        ]);
      } else {
        setStatusMessage(localData.message || 'Saved to Hash (local preview).');
        setStatusLinks([
          { label: 'Open draft in # Hash ↗', href: buildHashDraftUrl(effectiveTitle, seedText) },
        ]);
      }

      return savedId;
    } catch (err) {
      setStatusLinks([]);
      setStatusMessage(err instanceof Error ? err.message : 'Save error');
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [
    activeChannelsPayload,
    attachments,
    brand,
    inboundSource,
    isSaving,
    mediaNote,
    refreshStudio,
    seedText,
    selectedId,
    title,
    variants,
  ]);

  const handlePublishToPersonalPipe = useCallback(
    async (extensionNote?: string): Promise<boolean> => {
      if (!seedText.trim()) {
        setStatusLinks([]);
        setStatusMessage('Write your thought first before publishing to your Personal Pipe.');
        return false;
      }
      if (isPublishingPipe) return false;

      setIsPublishingPipe(true);
      try {
        const effectiveTitle = title.trim() || seedText.trim().slice(0, 48) || 'Untitled Note';
        await saveBroadcastInternal().catch(() => null);

        const res = await saveDraftToPipes({
          title: effectiveTitle,
          content: seedText,
          writingMode: 'quick',
          source: 'asterisk',
          channels: activeChannelsPayload(),
          extensionNote: extensionNote?.trim() || undefined,
          publishToPersonalPipe: true,
          sourceTitle: inboundSource?.sourceTitle,
          sourceUrl: inboundSource?.sourceUrl,
          tags: [brand],
        });

        if (res.ok) {
          const pipeSlug = res.data.publishedPipe || pipesSession?.user?.personalPipe || 'personal';
          setStatusMessage(`Published to pipe\\${pipeSlug}.`);
          setStatusLinks([
            ...(res.data.publishedUrl
              ? [{ label: `View pipe\\${pipeSlug} ↗`, href: res.data.publishedUrl }]
              : []),
            { label: 'Extend in # Hash ↗', href: res.data.extendInHashUrl },
          ]);
          return true;
        }

        if (res.needsAuth) {
          setStatusMessage('Sign in on Pipes to publish directly to your Personal Pipe.');
          setStatusLinks([
            { label: 'Sign up / Sign in ↗', href: PIPES_SIGNUP_URL },
            { label: 'Open draft in # Hash ↗', href: buildHashDraftUrl(effectiveTitle, seedText) },
          ]);
          return false;
        }

        setStatusMessage(res.message);
        setStatusLinks([
          { label: 'Open draft in # Hash ↗', href: buildHashDraftUrl(effectiveTitle, seedText) },
        ]);
        return false;
      } finally {
        setIsPublishingPipe(false);
      }
    },
    [
      activeChannelsPayload,
      brand,
      inboundSource,
      isPublishingPipe,
      pipesSession,
      saveBroadcastInternal,
      seedText,
      title,
    ]
  );

  const handleDeleteBroadcast = useCallback(
    async (id: number) => {
      const res = await fetch(`/api/studio?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        if (selectedId === id) handleNewNote();
        await refreshStudio();
        setStatusLinks([]);
        setStatusMessage('Deleted note from Hash.');
      }
    },
    [handleNewNote, refreshStudio, selectedId]
  );

  const handleMoveLinksToReply = useCallback(
    (p: PlatformId) => {
      const cur = variants[p];
      const { mainText, replyText } = extractLinksForThreadsReply(cur.body_text);
      setCustomized((prev) => ({ ...prev, [p]: true }));
      setVariants((prev) => ({
        ...prev,
        [p]: {
          ...prev[p],
          body_text: mainText,
          reply_text: replyText || prev[p].reply_text,
        },
      }));
      setStatusLinks([]);
      setStatusMessage(
        replyText
          ? `Moved URL out of ${PLATFORM_SPECS[p].shortName} into its self-reply.`
          : `No URLs found in ${PLATFORM_SPECS[p].shortName} copy.`
      );
    },
    [variants]
  );

  const handleCopyReplyOnly = useCallback(
    async (p: PlatformId) => {
      const reply = variants[p].reply_text.trim();
      if (!reply) return;
      await navigator.clipboard.writeText(reply);
      setStatusLinks([]);
      setStatusMessage(`Copied ${PLATFORM_SPECS[p].shortName} reply link.`);
    },
    [variants]
  );

  const handleCopyAndLog = useCallback(
    async (p: PlatformId, openTab: boolean): Promise<boolean> => {
      const cur = variants[p];
      const bodyText = cur.body_text.trim();
      if (!bodyText) {
        setStatusLinks([]);
        setStatusMessage(`Write your ${PLATFORM_SPECS[p].name} thought first.`);
        return false;
      }

      try {
        await navigator.clipboard.writeText(bodyText);
        const broadcastId = await saveBroadcastInternal();
        if (!broadcastId) return false;

        await fetch('/api/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            broadcastId,
            platform: p,
            bodyText,
            replyText: cur.reply_text,
            mode: 'copy',
          }),
        });
        await refreshStudio(broadcastId);
        if (openTab) {
          window.open(PLATFORM_SPECS[p].composeUrl, '_blank', 'noopener,noreferrer');
        }
        const replyHint =
          cur.reply_text.trim() && (p === 'threads' || p === 'facebook')
            ? ' Paste your link as the self-reply right after.'
            : '';
        setStatusLinks([]);
        setStatusMessage(
          openTab
            ? `Copied for ${PLATFORM_SPECS[p].shortName} and opened composer.${replyHint}`
            : `Copied for ${PLATFORM_SPECS[p].shortName} and logged rhythm.${replyHint}`
        );
        return true;
      } catch (err) {
        setStatusLinks([]);
        setStatusMessage(err instanceof Error ? err.message : 'Copy failed');
        return false;
      }
    },
    [refreshStudio, saveBroadcastInternal, variants]
  );

  const handleAutoPublish = useCallback(
    async (p: PlatformId): Promise<boolean> => {
      const cur = variants[p];
      const bodyText = cur.body_text.trim();
      if (!bodyText || isPublishing) return false;

      setIsPublishing(true);
      try {
        const broadcastId = await saveBroadcastInternal();
        if (!broadcastId) return false;

        const res = await fetch('/api/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            broadcastId,
            platform: p,
            bodyText,
            replyText: cur.reply_text,
            mode: 'api',
          }),
        });
        const data = await res.json();
        await refreshStudio(broadcastId);
        setStatusLinks([]);
        setStatusMessage(data.message || 'Publish check completed.');
        return Boolean(data.ok);
      } catch (err) {
        setStatusLinks([]);
        setStatusMessage(err instanceof Error ? err.message : 'Publish error');
        return false;
      } finally {
        setIsPublishing(false);
      }
    },
    [isPublishing, refreshStudio, saveBroadcastInternal, variants]
  );

  const handleAutoPublishMany = useCallback(
    async (platforms: PlatformId[]) => {
      if (platforms.length === 0 || isPublishing) return;
      setIsPublishing(true);
      try {
        const broadcastId = await saveBroadcastInternal();
        if (!broadcastId) return;

        const results = await Promise.all(
          platforms.map(async (p) => {
            const cur = variants[p];
            const bodyText = cur?.body_text?.trim() || '';
            if (!bodyText) return `${PLATFORM_SPECS[p].shortName}: empty`;
            const res = await fetch('/api/publish', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                broadcastId,
                platform: p,
                bodyText,
                replyText: cur.reply_text,
                mode: 'api',
              }),
            });
            const data = await res.json();
            return `${PLATFORM_SPECS[p].shortName}: ${data.ok ? 'published' : data.message || 'failed'}`;
          })
        );
        await refreshStudio(broadcastId);
        setStatusLinks([]);
        setStatusMessage(results.join(' · '));
      } catch (err) {
        setStatusLinks([]);
        setStatusMessage(err instanceof Error ? err.message : 'Batch publish error');
      } finally {
        setIsPublishing(false);
      }
    },
    [isPublishing, refreshStudio, saveBroadcastInternal, variants]
  );

  const handleToggleChecklist = useCallback(
    async (step: ChecklistStep) => {
      const nextVal = !Boolean(step.completed);
      await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_step', stepKey: step.step_key, completed: nextVal }),
      });
      await refreshStudio(selectedId);
    },
    [refreshStudio, selectedId]
  );

  const handleSavePlatformSetting = useCallback(
    async (p: PlatformId, handle: string, cadenceDays: number) => {
      await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_setting', platform: p, handle, cadenceDays }),
      });
      await refreshStudio(selectedId);
      setStatusLinks([]);
      setStatusMessage(`Updated ${PLATFORM_SPECS[p].name} settings.`);
    },
    [refreshStudio, selectedId]
  );

  return (
    <StudioContext.Provider
      value={{
        broadcasts,
        cadence,
        checklist,
        platformSettings,
        apiStatus,
        pipesSession,
        selectedId,
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
        drawerOpen,
        setDrawerOpen,
        isSaving,
        isPublishing,
        isPublishingPipe,
        statusMessage,
        setStatusMessage,
        statusLinks,
        setStatusLinks,
        handleNewNote,
        handleHydrateBroadcast,
        handleSaveDraft,
        handlePublishToPersonalPipe,
        handleDeleteBroadcast,
        handleMoveLinksToReply,
        handleCopyReplyOnly,
        handleCopyAndLog,
        handleAutoPublish,
        handleAutoPublishMany,
        handleToggleChecklist,
        handleSavePlatformSetting,
      }}
    >
      {children}
    </StudioContext.Provider>
  );
}
