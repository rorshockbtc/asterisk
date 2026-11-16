import { NextResponse } from 'next/server';
import { PLATFORM_ORDER, type PlatformId } from '@/lib/platforms';
import {
  resolveWorkspaceOwner,
  toggleSetupStep,
  updatePlatformSetting,
} from '@/lib/workspace-store';

export async function POST(req: Request) {
  try {
    const owner = await resolveWorkspaceOwner();
    if (!owner.ok) {
      return NextResponse.json({ error: owner.error }, { status: owner.status });
    }

    const body = (await req.json()) as {
      action?: 'toggle_step' | 'update_setting';
      stepKey?: string;
      completed?: boolean;
      platform?: PlatformId;
      handle?: string;
      cadenceDays?: number;
    };

    if (body.action === 'toggle_step' && body.stepKey) {
      await toggleSetupStep(owner.ownerKey, body.stepKey, Boolean(body.completed));
      return NextResponse.json({ success: true });
    }

    if (body.action === 'update_setting' && body.platform && PLATFORM_ORDER.includes(body.platform)) {
      const safeDays = Math.min(30, Math.max(1, Number(body.cadenceDays || 4)));
      await updatePlatformSetting(
        owner.ownerKey,
        body.platform,
        String(body.handle || '').trim(),
        safeDays
      );
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid setup action' }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update setup';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
