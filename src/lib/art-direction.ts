/**
 * Watercolor plate registry ("after Folon"). See ART_DIRECTION.md.
 * Layers are painted on white paper and composited with `mix-blend-mode: multiply` (`.wc-glaze`).
 * All files live in /public/art and are produced by `scripts/process-art.mjs`.
 */
export const ART = {
  heroPlate: {
    src: '/art/hero-dawn.webp',
    srcSmall: '/art/hero-dawn-1200.webp',
    alt: 'A small figure in a long coat stands on a pale horizon watching a pink sun rise through a violet dawn sky.',
  },
  sky: { src: '/art/layer-sky.webp', srcSmall: '/art/layer-sky-1200.webp' },
  skyBold: { src: '/art/hero-sky-bold.webp', srcSmall: '/art/hero-sky-bold-1200.webp' },
  figure: { src: '/art/layer-traveler.webp' },
  figureRelease: { src: '/art/layer-figure-release.webp' },
  bird: { src: '/art/layer-bird.webp' },
  envelopeUp: { src: '/art/layer-envelope-up.webp' },
  envelopeDown: { src: '/art/layer-envelope-down.webp' },
  panorama: {
    src: '/art/panorama-horizon.webp',
    srcSmall: '/art/panorama-horizon-1600.webp',
    alt: 'A long dawn horizon with three small figures far apart: one carrying a ladder, one carrying an oversized pencil, one carrying a small paper house.',
  },
  window: {
    src: '/art/scene-open-window.webp',
    srcSmall: '/art/scene-open-window-640.webp',
    alt: 'An open window floating in a pale sky, with soft light and small birds drifting out of it.',
  },
  door: {
    src: '/art/scene-door.webp',
    srcSmall: '/art/scene-door-640.webp',
    alt: 'A single door standing alone in a pale peach field, slightly open, with warm pink light spilling out.',
  },
} as const;

export type RoomArtId = 'threads' | 'x' | 'facebook' | 'substack' | 'instagram' | 'tiktok';

export const ROOM_ART: Record<RoomArtId, { src: string; srcSmall: string; alt: string }> = {
  threads: {
    src: '/art/room-threads.webp',
    srcSmall: '/art/room-threads-640.webp',
    alt: 'A figure walks a single thin thread stretched across a violet and pink dusk sky.',
  },
  x: {
    src: '/art/room-x.webp',
    srcSmall: '/art/room-x-640.webp',
    alt: 'A figure at the top of a tall slender ladder releases a single bird into a clear blue sky.',
  },
  facebook: {
    src: '/art/room-facebook.webp',
    srcSmall: '/art/room-facebook-640.webp',
    alt: 'A figure waves toward a small cluster of houses with glowing windows on a warm evening hill.',
  },
  substack: {
    src: '/art/room-substack.webp',
    srcSmall: '/art/room-substack-640.webp',
    alt: 'A figure walks across the pages of a giant open book that becomes a landscape.',
  },
  instagram: {
    src: '/art/room-instagram.webp',
    srcSmall: '/art/room-instagram-640.webp',
    alt: 'A figure stands before an empty square frame in a field; the sky inside the frame is more vivid.',
  },
  tiktok: {
    src: '/art/room-tiktok.webp',
    srcSmall: '/art/room-tiktok-640.webp',
    alt: 'A small figure watches a tall, narrow doorway of light standing in a dim violet field.',
  },
};
