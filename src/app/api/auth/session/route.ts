import { NextResponse } from 'next/server';
import { validateClerkMember } from '@/lib/clerk-auth';

/**
 * Lightweight session diagnostic endpoint for Pipes / client inspection.
 * Never leaks emails or secret keys; reports mode (`clerk` vs `local-stub`) and profile validation.
 */
export async function GET() {
  const session = await validateClerkMember();
  return NextResponse.json({
    authenticated: session.authenticated,
    mode: session.mode,
    hasProfile: Boolean(session.profile),
    missingProfile: Boolean(session.missingProfile),
    tier: session.profile?.tier ?? null,
  });
}
