/**
 * Shared, static SVG filters for the watercolor art layer. Mounted once in the root layout.
 * Never animate these filter primitives; animate transform / opacity / masks instead.
 */
export default function WatercolorDefs() {
  return (
    <svg aria-hidden="true" focusable="false" width="0" height="0" style={{ position: 'absolute' }}>
      <defs>
        <filter id="wc-bleed" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="3" seed="7" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="9" xChannelSelector="R" yChannelSelector="G" />
          <feGaussianBlur stdDeviation="0.6" />
        </filter>
        <filter id="wc-edge" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="3" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="4" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  );
}
