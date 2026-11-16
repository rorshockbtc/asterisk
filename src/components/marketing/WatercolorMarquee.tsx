import React from 'react';

const ITEMS = [
  { text: 'Write', accent: false },
  { text: '→', accent: true },
  { text: 'Tune', accent: false },
  { text: '→', accent: true },
  { text: 'Ship', accent: false },
  { text: '*', accent: true },
  { text: 'Six Rooms', accent: false },
  { text: ': - ]', accent: true },
  { text: 'One Voice', accent: false },
  { text: '*', accent: true },
  { text: 'Open Source', accent: false },
  { text: '|||', accent: true },
];

export default function WatercolorMarquee() {
  const track = [...ITEMS, ...ITEMS];

  return (
    <div
      aria-hidden="true"
      className="overflow-hidden border-y border-[var(--a-rule)] bg-[var(--a-surface)]/55 py-5 sm:py-6"
    >
      <div className="wc-marquee-track flex items-baseline gap-8 sm:gap-12 whitespace-nowrap font-display text-3xl sm:text-5xl font-bold tracking-[-0.03em]">
        {track.map((item, idx) => (
          <span
            key={idx}
            className={
              item.accent
                ? 'font-display text-[var(--wc-pigment)]'
                : 'text-[var(--wc-ink)]/85'
            }
          >
            {item.text}
          </span>
        ))}
      </div>
    </div>
  );
}
