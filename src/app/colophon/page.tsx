import type { Metadata } from 'next';
import ColophonView from '@/components/site/ColophonView';
import { buildPageMetadata, OG_IMAGES } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Colophon & Art Direction — asterisk (*)',
  description:
    'Print vs. watercolor: why asterisk pairs Jean-Michel Folon-inspired watercolor motion with Colon Hyphen Bracket’s typographic spine.',
  path: '/colophon',
  ogImage: OG_IMAGES.colophon,
  type: 'article',
});

export default function ColophonPage() {
  return <ColophonView />;
}
