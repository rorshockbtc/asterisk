import type { Metadata } from 'next';
import CalmSetup from '@/components/studio/CalmSetup';
import { buildPageMetadata, OG_IMAGES } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Setup & Walkthroughs — asterisk (*)',
  description:
    'Prepare each social room once with plain-English, tap-by-tap creator guides and optional auto-publishing.',
  path: '/app/setup',
  ogImage: OG_IMAGES.app,
});

export default function SetupPage() {
  return <CalmSetup />;
}
