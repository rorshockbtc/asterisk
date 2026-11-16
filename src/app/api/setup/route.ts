import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { PLATFORM_ORDER, type PlatformId } from '@/lib/platforms';

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      action?: 'toggle_step' | 'update_setting';
      stepKey?: string;
      completed?: boolean;
      platform?: PlatformId;
      handle?: string;
      cadenceDays?: number;
    };

    const db = getDb();

    if (body.action === 'toggle_step' && body.stepKey) {
      db.prepare(`UPDATE setup_checklist SET completed = ? WHERE step_key = ?`).run(
        body.completed ? 1 : 0,
        body.stepKey
      );
      return NextResponse.json({ success: true });
    }

    if (body.action === 'update_setting' && body.platform && PLATFORM_ORDER.includes(body.platform)) {
      const safeDays = Math.min(30, Math.max(1, Number(body.cadenceDays || 4)));
      db.prepare(`
        UPDATE platform_settings
        SET handle = ?, cadence_days = ?, updated_at = CURRENT_TIMESTAMP
        WHERE platform = ?
      `).run(String(body.handle || '').trim(), safeDays, body.platform);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid setup action' }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update setup';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
