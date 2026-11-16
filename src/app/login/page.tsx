import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import LoginDoor from '@/components/site/LoginDoor';
import { buildPageMetadata, OG_IMAGES } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Sign in — asterisk (*)',
  description:
    'Step inside your private asterisk workspace synced with Hash and six-channel cadence memory.',
  path: '/login',
  ogImage: OG_IMAGES.login,
});

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[var(--a-bg)] font-sans text-[13px] text-[var(--a-muted)]">
          Opening the door…
        </div>
      }
    >
      <LoginDoor />
    </Suspense>
  );
}
