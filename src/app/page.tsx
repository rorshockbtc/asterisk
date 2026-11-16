import type { Metadata } from 'next';
import SiteHeader from '@/components/site/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';
import Hero from '@/components/marketing/Hero';
import WatercolorMarquee from '@/components/marketing/WatercolorMarquee';
import AsteriskExplainer from '@/components/marketing/AsteriskExplainer';
import Panorama from '@/components/marketing/Panorama';
import HowItWorks from '@/components/marketing/HowItWorks';
import PublicDemo from '@/components/marketing/PublicDemo';
import OpenSource from '@/components/marketing/OpenSource';
import ArtNote from '@/components/marketing/ArtNote';
import Closing from '@/components/marketing/Closing';
import { buildPageMetadata, OG_IMAGES } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'asterisk (*) — Say it once. Let it travel.',
  description:
    'Write one honest thought. asterisk tunes it for Threads, X, Facebook, Substack, Instagram, and TikTok, checks the weather, and sends it on its way.',
  path: '/',
  ogImage: OG_IMAGES.home,
});

export default function Home() {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-full focus:bg-[var(--a-ink)] focus:px-5 focus:py-3 focus:text-[var(--a-bg)]"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="main">
        <Hero />
        <WatercolorMarquee />
        <AsteriskExplainer />
        <Panorama />
        <HowItWorks />
        <PublicDemo />
        <OpenSource />
        <ArtNote />
        <Closing />
      </main>
      <SiteFooter />
    </>
  );
}
