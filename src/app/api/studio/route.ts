import { NextResponse } from 'next/server';
import {
  MAX_MEDIA_IMAGES,
  type MediaAttachment,
} from '@/lib/platforms';
import { getApiConnectionStatus } from '@/lib/publishers';
import {
  deleteBroadcast,
  loadWorkspace,
  resolveWorkspaceOwner,
  saveBroadcast,
  type VariantInput,
} from '@/lib/workspace-store';

export async function GET() {
  try {
    const owner = await resolveWorkspaceOwner();
    if (!owner.ok) {
      return NextResponse.json({ error: owner.error }, { status: owner.status });
    }

    const workspace = await loadWorkspace(owner.ownerKey);
    return NextResponse.json({
      ...workspace,
      apiStatus: getApiConnectionStatus(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load workspace';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const owner = await resolveWorkspaceOwner();
    if (!owner.ok) {
      return NextResponse.json({ error: owner.error }, { status: owner.status });
    }

    const body = (await req.json()) as {
      id?: number;
      title?: string;
      brand?: string;
      seed_text?: string;
      media_note?: string;
      media_attachments?: MediaAttachment[];
      variants?: VariantInput[];
    };

    const title = String(body.title || '').trim() || 'Untitled Note';
    const brand = String(body.brand || 'Build Log').trim();
    const seedText = String(body.seed_text || '').trim();
    const mediaNote = String(body.media_note || '').trim();
    const mediaAttachments = Array.isArray(body.media_attachments)
      ? body.media_attachments.slice(0, MAX_MEDIA_IMAGES)
      : [];
    const mediaJson = JSON.stringify(mediaAttachments);
    const variants = Array.isArray(body.variants) ? body.variants : [];

    const broadcastId = await saveBroadcast(owner.ownerKey, {
      id: body.id,
      title,
      brand,
      seedText,
      mediaNote,
      mediaJson,
      variants,
    });

    return NextResponse.json({ success: true, id: broadcastId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save broadcast';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const owner = await resolveWorkspaceOwner();
    if (!owner.ok) {
      return NextResponse.json({ error: owner.error }, { status: owner.status });
    }

    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get('id') || 0);
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    await deleteBroadcast(owner.ownerKey, id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete broadcast';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
