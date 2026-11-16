import type { Metadata } from 'next';

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://asterisk.pipes.pink').replace(
  /\/+$/,
  ''
);

export const OG_IMAGES = {
  home: '/og/og-home.png',
  colophon: '/og/og-colophon.png',
  login: '/og/og-login.png',
  rooms: '/og/og-rooms.png',
  app: '/og/og-app.png',
} as const;

export function buildPageMetadata({
  title,
  description,
  path = '/',
  ogImage = OG_IMAGES.home,
  type = 'website',
}: {
  title: string;
  description: string;
  path?: string;
  ogImage?: string;
  type?: 'website' | 'article';
}): Metadata {
  const canonicalPath = path.startsWith('/') ? path : `/${path}`;
  return {
    title,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title,
      description,
      url: canonicalPath,
      siteName: 'asterisk (*)',
      locale: 'en_US',
      type,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          type: 'image/png',
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}
