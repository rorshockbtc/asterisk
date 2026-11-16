import type { CadenceStatus, MediaAttachment, PlatformId } from './platforms';

export type StudioView = 'studio' | 'playbooks' | 'setup';

export interface VariantRecord {
  id?: number;
  platform: PlatformId;
  body_text: string;
  reply_text: string;
  status: string;
  external_url?: string;
  published_at?: string | null;
}

export interface BroadcastRecord {
  id: number;
  title: string;
  brand: string;
  seed_text: string;
  media_note: string;
  media_attachments?: MediaAttachment[];
  created_at: string;
  updated_at: string;
  variants: VariantRecord[];
}

export interface ChecklistStep {
  id: number;
  platform: PlatformId;
  step_key: string;
  label: string;
  detail: string;
  completed: number;
}

export interface PlatformSetting {
  platform: PlatformId;
  handle: string;
  cadence_days: number;
}

export type ApiStatusMap = Record<PlatformId, { configured: boolean; note: string }>;

export interface StudioHydrationPayload {
  broadcasts: BroadcastRecord[];
  cadence: CadenceStatus[];
  setupChecklist: ChecklistStep[];
  platformSettings: PlatformSetting[];
  apiStatus: ApiStatusMap | null;
}
