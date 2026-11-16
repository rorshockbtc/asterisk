'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { ImagePlus, Layers, X } from 'lucide-react';
import {
  formatAspectBadge,
  MAX_MEDIA_IMAGES,
  type MediaAttachment,
} from '@/lib/platforms';

async function fileToAttachment(file: File): Promise<MediaAttachment | null> {
  if (!file.type.startsWith('image/')) return null;

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Could not decode image'));
      el.src = objectUrl;
    });

    const maxEdge = 1000;
    const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
    const width = Math.max(1, Math.round((img.naturalWidth || 800) * scale));
    const height = Math.max(1, Math.round((img.naturalHeight || 600) * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, width, height);

    let dataUrl = canvas.toDataURL('image/webp', 0.84);
    if (!dataUrl.startsWith('data:image/webp')) {
      dataUrl = canvas.toDataURL('image/jpeg', 0.84);
    }

    return {
      id: `upload-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: file.name,
      url: dataUrl,
      width,
      height,
      source: 'upload',
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Multi-image tray (up to 4 images) + "Pull from a Pipe" picker + optional clip reminder.
 * Works identically in both the public browser demo and logged-in /app workspace.
 */
export default function MediaTray({
  attachments,
  onChangeAttachments,
  mediaNote,
  onChangeMediaNote,
  compact = false,
}: {
  attachments: MediaAttachment[];
  onChangeAttachments: (next: MediaAttachment[]) => void;
  mediaNote: string;
  onChangeMediaNote: (next: string) => void;
  compact?: boolean;
}) {
  const inputId = useId();
  const noteId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pipeItems, setPipeItems] = useState<MediaAttachment[]>([]);
  const [loadingPipe, setLoadingPipe] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [helperMsg, setHelperMsg] = useState('');

  useEffect(() => {
    if (!pickerOpen) return;
    const onDown = (e: PointerEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPickerOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [pickerOpen]);

  async function addFiles(fileList: FileList | File[]) {
    const remaining = MAX_MEDIA_IMAGES - attachments.length;
    if (remaining <= 0) {
      setHelperMsg(`Maximum ${MAX_MEDIA_IMAGES} images reached — remove one to add another.`);
      return;
    }
    const files = Array.from(fileList).slice(0, remaining);
    const decoded = (await Promise.all(files.map(fileToAttachment))).filter(
      (item): item is MediaAttachment => item !== null
    );
    if (decoded.length === 0) {
      setHelperMsg('Choose PNG, JPG, or WebP images (up to 4).');
      return;
    }
    setHelperMsg('');
    onChangeAttachments([...attachments, ...decoded].slice(0, MAX_MEDIA_IMAGES));
  }

  async function togglePipePicker() {
    const next = !pickerOpen;
    setPickerOpen(next);
    if (!next || pipeItems.length > 0) return;
    setLoadingPipe(true);
    try {
      const res = await fetch('/api/pipes/media');
      if (res.ok) {
        const data = (await res.json()) as { items?: MediaAttachment[] };
        setPipeItems(data.items || []);
      }
    } catch {
      // Leave graceful empty list
    } finally {
      setLoadingPipe(false);
    }
  }

  function attachFromPipe(item: MediaAttachment) {
    if (attachments.some((a) => a.id === item.id)) return;
    if (attachments.length >= MAX_MEDIA_IMAGES) {
      setHelperMsg(`Maximum ${MAX_MEDIA_IMAGES} images reached — remove one first.`);
      return;
    }
    setHelperMsg('');
    onChangeAttachments([...attachments, item]);
    setPickerOpen(false);
  }

  function removeAttachment(id: string) {
    setHelperMsg('');
    onChangeAttachments(attachments.filter((a) => a.id !== id));
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (e.dataTransfer?.files?.length) {
          void addFiles(e.dataTransfer.files);
        }
      }}
      className={`space-y-2.5 transition-colors ${
        dragging ? 'rounded-xl bg-[var(--a-surface)]/70 p-2 -m-2' : ''
      }`}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <input
          ref={fileInputRef}
          id={inputId}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) => {
            if (e.target.files?.length) {
              void addFiles(e.target.files);
              e.target.value = '';
            }
          }}
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={attachments.length >= MAX_MEDIA_IMAGES}
          className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-[var(--a-rule)] bg-[var(--a-well)] px-3.5 text-[13px] font-semibold text-[var(--a-ink)] hover:border-[var(--a-accent)] disabled:opacity-45 cursor-pointer transition-colors whitespace-nowrap"
        >
          <ImagePlus className="h-3.5 w-3.5 text-[var(--a-accent-text)]" aria-hidden="true" />
          <span>Add images ({attachments.length}/{MAX_MEDIA_IMAGES})</span>
        </button>

        <div ref={pickerRef} className="relative">
          <button
            type="button"
            aria-expanded={pickerOpen}
            onClick={togglePipePicker}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-[var(--a-rule)] bg-[var(--a-bg)] px-3.5 text-[13px] font-semibold text-[var(--a-ink)] hover:border-[var(--a-accent)] cursor-pointer transition-colors whitespace-nowrap"
          >
            <Layers className="h-3.5 w-3.5 text-[var(--a-accent-text)]" aria-hidden="true" />
            <span>Pull from a Pipe</span>
          </button>

          {pickerOpen && (
            <div className="absolute left-0 z-50 mt-2 w-80 max-w-[90vw] rounded-2xl border border-[var(--a-rule)] bg-[var(--a-well)] p-3 shadow-[0_20px_50px_-16px_rgba(42,47,69,0.28)] space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-semibold text-[var(--a-ink)]">
                  Attach from Pipes &amp; Hash
                </p>
                <span className="text-[12px] text-[var(--a-muted)] tabular-nums">
                  {attachments.length}/{MAX_MEDIA_IMAGES}
                </span>
              </div>

              {loadingPipe ? (
                <p className="py-4 text-[13px] text-[var(--a-muted)]">Loading visuals…</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {pipeItems.map((item) => {
                    const alreadyAdded = attachments.some((a) => a.id === item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        disabled={alreadyAdded || attachments.length >= MAX_MEDIA_IMAGES}
                        onClick={() => attachFromPipe(item)}
                        className="group rounded-xl border border-[var(--a-rule)] bg-[var(--a-bg)] p-1.5 text-left hover:border-[var(--a-accent)] disabled:opacity-50 cursor-pointer transition-colors"
                      >
                        <div className="aspect-[4/3] w-full overflow-hidden rounded-lg bg-[var(--a-surface)]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.url}
                            alt={item.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="mt-1.5 px-0.5 space-y-0.5">
                          <span className="block truncate text-[12px] font-semibold text-[var(--a-ink)]">
                            {item.name}
                          </span>
                          <span className="block text-[11px] text-[var(--a-muted)]">
                            {alreadyAdded
                              ? 'Attached ✓'
                              : `${item.pipeName || 'Pipe'} · ${formatAspectBadge(item.width, item.height)}`}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <label htmlFor={noteId} className="sr-only">
          Video or clip note
        </label>
        <input
          id={noteId}
          type="text"
          value={mediaNote}
          onChange={(e) => onChangeMediaNote(e.target.value)}
          placeholder="Clip note — e.g. 16:9 QuickTime or 4:5 screenshot"
          className={`min-w-[200px] flex-1 border-0 border-b border-[var(--a-rule)] bg-transparent px-0 text-[var(--a-ink)] placeholder:text-[var(--a-muted)]/60 focus:border-[var(--a-accent)] focus:outline-none ${
            compact ? 'min-h-[36px] text-[14px]' : 'min-h-[42px] text-[15px]'
          }`}
        />
      </div>

      {helperMsg && (
        <p className="text-[13px] font-medium text-[var(--a-accent-text)]">{helperMsg}</p>
      )}

      {attachments.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          {attachments.map((img) => (
            <div
              key={img.id}
              className="group relative overflow-hidden rounded-xl border border-[var(--a-rule)] bg-[var(--a-well)]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt={img.name}
                className="block h-20 w-full object-cover"
              />
              <div className="flex items-center justify-between gap-1 px-2 py-1 text-[12px] text-[var(--a-muted)]">
                <span className="truncate font-medium">
                  {img.source === 'pipe' ? `${img.pipeName || 'Pipe'} · ` : ''}
                  {formatAspectBadge(img.width, img.height)}
                </span>
                <button
                  type="button"
                  aria-label={`Remove ${img.name}`}
                  onClick={() => removeAttachment(img.id)}
                  className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full hover:bg-[var(--a-surface)] text-[var(--a-ink)] cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
