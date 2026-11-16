import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import CalmStudio from '@/components/studio/CalmStudio';
import { buildPageMetadata, OG_IMAGES } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Compose — asterisk (*)',
  description:
    'Write one honest thought with up to four images, check room weather, save to Hash, and publish cleanly across six channels.',
  path: '/app',
  ogImage: OG_IMAGES.app,
});

export default function AsteriskAppPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-[54rem] px-5 sm:px-8 py-14 font-sans text-[13px] text-[var(--a-muted)]">
          Warming the writing sheet…
        </div>
      }
    >
      <CalmStudio />
    </Suspense>
  );
}
