import { cookies } from 'next/headers';
import { auth } from '@clerk/nextjs/server';
import { neon } from '@neondatabase/serverless';
import { SESSION_COOKIE } from '@/lib/session';

export interface ClerkMemberProfile {
  id: string;
  clerkId: string;
  email: string;
  tier: string;
  realtimeAlias: string | null;
}

export interface MemberSessionResult {
  authenticated: boolean;
  mode: 'clerk' | 'local-stub';
  clerkId: string | null;
  profile: ClerkMemberProfile | null;
  missingProfile?: boolean;
}

export function isClerkConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY
  );
}

export function isNeonConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/**
 * Validates the current caller against Clerk + Neon `profiles` table when configured,
 * or falls back seamlessly to local cookie session preview when cloned without secrets.
 */
export async function validateClerkMember(): Promise<MemberSessionResult> {
  if (!isClerkConfigured()) {
    const store = await cookies();
    const hasCookie = Boolean(store.get(SESSION_COOKIE)?.value);
    return {
      authenticated: hasCookie,
      mode: 'local-stub',
      clerkId: null,
      profile: null,
    };
  }

  const { userId } = await auth();
  if (!userId) {
    return {
      authenticated: false,
      mode: 'clerk',
      clerkId: null,
      profile: null,
    };
  }

  if (!isNeonConfigured()) {
    const requireProfile = process.env.ASTERISK_REQUIRE_PROFILES_ROW === '1';
    return {
      authenticated: !requireProfile,
      mode: 'clerk',
      clerkId: userId,
      profile: null,
      missingProfile: requireProfile,
    };
  }

  try {
    const sql = neon(process.env.DATABASE_URL!);
    const rows = (await sql`
      SELECT id, clerk_id AS "clerkId", email, tier
      FROM profiles
      WHERE clerk_id = ${userId}
      LIMIT 1
    `) as Omit<ClerkMemberProfile, 'realtimeAlias'>[];

    const profile: ClerkMemberProfile | null = rows[0]
      ? { ...rows[0], realtimeAlias: null }
      : null;
    const requireProfile = process.env.ASTERISK_REQUIRE_PROFILES_ROW === '1';
    return {
      authenticated: profile ? true : !requireProfile,
      mode: 'clerk',
      clerkId: userId,
      profile,
      missingProfile: !profile,
    };
  } catch (err) {
    console.error('[asterisk] Neon profile validation failed:', err);
    const requireProfile = process.env.ASTERISK_REQUIRE_PROFILES_ROW === '1';
    return {
      authenticated: !requireProfile,
      mode: 'clerk',
      clerkId: userId,
      profile: null,
      missingProfile: true,
    };
  }
}
