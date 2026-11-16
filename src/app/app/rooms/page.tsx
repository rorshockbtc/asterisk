import type { Metadata } from 'next';
import RoomsGallery from '@/components/studio/RoomsGallery';
import { buildPageMetadata, OG_IMAGES } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Six Rooms — asterisk (*)',
  description:
    'Every social room has its own weather: Threads, X, Facebook, Substack Notes, Instagram, and TikTok calibrated without algorithms or ad-graph guesswork.',
  path: '/app/rooms',
  ogImage: OG_IMAGES.rooms,
});

export default function RoomsPage() {
  return <RoomsGallery />;
}
