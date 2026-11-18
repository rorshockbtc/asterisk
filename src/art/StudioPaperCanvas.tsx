'use client';

import React, { useEffect, useId, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';

interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** Folon dawn & sky watercolor pigments over Alabaster paper */
const PIGMENTS: Rgb[] = [
  { r: 254, g: 41, b: 158 },  // Sovereign Rose (#FE299E)
  { r: 247, g: 185, b: 201 }, // Dawn Pink (#F7B9C9)
  { r: 250, g: 214, b: 184 }, // Peach Haze (#FAD6B8)
  { r: 156, g: 143, b: 208 }, // Folon Violet (#9C8FD0)
  { r: 169, g: 211, b: 234 }, // Sky Wash (#A9D3EA)
];

interface SatelliteFleck {
  ox: number;
  oy: number;
  vx: number;
  vy: number;
  r: number;
  maxScale: number;
}

interface WaterBloom {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  baseRadius: number;
  maxSpread: number;
  aspect: number;
  color: Rgb;
  bornAt: number;
  lifeMs: number;
  evaporateAt?: number;
  lobes: number[];
  peakAlpha: number;
  flecks: SatelliteFleck[];
}

const INTERACTIVE_OR_SURFACE_SELECTOR =
  '[data-studio-surface], header, nav, input, textarea, button, a, select, label, summary, details, dialog, [role="tablist"], [role="tabpanel"]';

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / Math.max(0.0001, edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function lerpColor(a: Rgb, b: Rgb, t: number): Rgb {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  };
}

function samplePalette(distance: number): Rgb {
  const cycle = (distance / 280) % PIGMENTS.length;
  const idx = Math.floor(cycle);
  const next = (idx + 1) % PIGMENTS.length;
  return lerpColor(PIGMENTS[idx], PIGMENTS[next], cycle - idx);
}

function scheduleSoftEvaporate(list: WaterBloom[], softCap: number, now: number) {
  let activeCount = 0;
  for (let i = 0; i < list.length; i++) {
    if (list[i].evaporateAt === undefined) activeCount += 1;
  }
  for (let i = 0; i < list.length && activeCount > softCap; i++) {
    if (list[i].evaporateAt === undefined) {
      list[i].evaporateAt = now;
      activeCount -= 1;
    }
  }
}

/**
 * Interactive background-only watercolor drop & blossom layer for `/app`.
 * - Ignores events inside writing sheets, previews, controls, or chrome.
 * - Spawns organic multi-lobed pigment drops + satellite droplets (zero trailing strings).
 * - Sleeps completely when idle (`rafId = 0`), when off-screen, or when hidden.
 */
export default function StudioPaperCanvas() {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const filterId = `studio-paper-bleed-${useId().replace(/:/g, '')}`;
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) return;
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let rafId = 0;
    let totalDistance = 0;
    let skippedByContentVis = false;
    let lastPoint: { x: number; y: number; time: number } | null = null;
    const dabs: WaterBloom[] = [];

    const resize = () => {
      const rect = host.getBoundingClientRect();
      width = Math.max(1, rect.width || window.innerWidth);
      height = Math.max(1, rect.height || window.innerHeight);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    const spawnDab = (
      x: number,
      y: number,
      dx: number,
      dy: number,
      speed: number,
      now: number,
      boost = 1
    ) => {
      const angle = Math.atan2(dy, dx);
      const color = samplePalette(totalDistance);
      const clampSpeed = Math.min(speed, 44);
      const baseRadius = (18 + clampSpeed * 0.45 + Math.random() * 11) * boost;

      const lobes: number[] = [];
      for (let i = 0; i < 11; i++) {
        lobes.push(0.78 + Math.random() * 0.44);
      }

      const fleckCount = 2 + Math.floor(Math.random() * 3);
      const flecks: SatelliteFleck[] = [];
      for (let i = 0; i < fleckCount; i++) {
        const spreadAngle = angle + (Math.random() - 0.5) * 2.4;
        const reach = (18 + Math.random() * 28) * boost;
        flecks.push({
          ox: Math.cos(spreadAngle) * reach,
          oy: Math.sin(spreadAngle) * reach,
          vx: Math.cos(spreadAngle) * (0.14 + Math.random() * 0.25),
          vy: Math.sin(spreadAngle) * (0.14 + Math.random() * 0.25),
          r: (2.2 + Math.random() * 4.0) * boost,
          maxScale: 2.0 + Math.random() * 0.65,
        });
      }

      dabs.push({
        x: x + (Math.random() - 0.5) * 8,
        y: y + (Math.random() - 0.5) * 8,
        vx: dx * 0.03 + (Math.random() - 0.5) * 0.28,
        vy: dy * 0.03 + (Math.random() - 0.5) * 0.28,
        angle: angle + (Math.random() - 0.5) * 0.4,
        baseRadius,
        maxSpread: 2.05 + Math.random() * 0.55,
        aspect: 1.05 + Math.min(clampSpeed / 48, 0.55),
        color,
        bornAt: now,
        lifeMs: 8500 + Math.random() * 2000,
        lobes,
        peakAlpha: 0.08 + Math.random() * 0.045,
        flecks,
      });

      scheduleSoftEvaporate(dabs, 220, now);
    };

    const drawDab = (dab: WaterBloom, now: number): boolean => {
      const age = now - dab.bornAt;
      if (age >= dab.lifeMs) return false;
      if (age < 0) return true;

      let evapT = 0;
      if (dab.evaporateAt !== undefined) {
        evapT = Math.min(1, Math.max(0, (now - dab.evaporateAt) / 2600));
        if (evapT >= 1) return false;
      }

      const t = age / dab.lifeMs;
      const fastSpread = 1 - Math.pow(1 - Math.min(1, age / 1300), 2.5);
      const radius =
        dab.baseRadius *
        (1 + (dab.maxSpread - 1) * (fastSpread + t * 0.34)) *
        (1 + smoothstep(0.58, 1.0, t) * 0.26) *
        (1 + 0.35 * evapT);

      const fadeIn = Math.min(1, age / 220);
      const fadeOut = t > 0.52 ? Math.pow(1 - (t - 0.52) / 0.48, 1.65) : 1;
      const evapFade = dab.evaporateAt !== undefined ? Math.pow(1 - evapT, 1.75) : 1;
      const alpha = dab.peakAlpha * fadeIn * fadeOut * evapFade;
      if (alpha <= 0.0025) return dab.evaporateAt === undefined;

      const driftFrames = age / 16.67;
      const cx = dab.x + dab.vx * driftFrames * 0.42;
      const cy = dab.y + dab.vy * driftFrames * 0.42;
      const { r, g, b } = dab.color;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(dab.angle);
      ctx.scale(dab.aspect * (1 - t * 0.14), 1 + t * 0.1);

      const grad = ctx.createRadialGradient(0, 0, radius * 0.08, 0, 0, radius);
      grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${(alpha * 0.58).toFixed(4)})`);
      grad.addColorStop(0.62, `rgba(${r}, ${g}, ${b}, ${(alpha * 0.92).toFixed(4)})`);
      grad.addColorStop(0.84, `rgba(${r}, ${g}, ${b}, ${(alpha * 0.48).toFixed(4)})`);
      grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

      ctx.fillStyle = grad;
      ctx.beginPath();
      const n = dab.lobes.length;
      const pts: Array<{ x: number; y: number }> = [];
      for (let i = 0; i < n; i++) {
        const theta = (i / n) * Math.PI * 2;
        const wobble = dab.lobes[i] + Math.sin(t * 2.8 + i * 1.7) * 0.06;
        const rr = radius * wobble;
        pts.push({ x: Math.cos(theta) * rr, y: Math.sin(theta) * rr });
      }
      for (let i = 0; i < n; i++) {
        const curr = pts[i];
        const next = pts[(i + 1) % n];
        const midX = (curr.x + next.x) * 0.5;
        const midY = (curr.y + next.y) * 0.5;
        if (i === 0) {
          const prev = pts[n - 1];
          ctx.moveTo((prev.x + curr.x) * 0.5, (prev.y + curr.y) * 0.5);
        }
        ctx.quadraticCurveTo(curr.x, curr.y, midX, midY);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      for (let i = 0; i < dab.flecks.length; i++) {
        const f = dab.flecks[i];
        const fx = cx + f.ox + f.vx * driftFrames * 0.35;
        const fy = cy + f.oy + f.vy * driftFrames * 0.35;
        const fr = f.r * (1 + (f.maxScale - 1) * fastSpread);
        const fGrad = ctx.createRadialGradient(fx, fy, fr * 0.1, fx, fy, fr);
        fGrad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${(alpha * 0.7).toFixed(4)})`);
        fGrad.addColorStop(0.75, `rgba(${r}, ${g}, ${b}, ${(alpha * 0.88).toFixed(4)})`);
        fGrad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        ctx.fillStyle = fGrad;
        ctx.beginPath();
        ctx.arc(fx, fy, fr, 0, Math.PI * 2);
        ctx.fill();
      }

      return true;
    };

    const startLoop = () => {
      if (rafId || document.hidden || skippedByContentVis) return;
      const tick = (now: number) => {
        if (document.hidden || skippedByContentVis) {
          rafId = 0;
          return;
        }
        ctx.clearRect(0, 0, width, height);
        ctx.globalCompositeOperation = 'multiply';
        for (let i = dabs.length - 1; i >= 0; i--) {
          if (!drawDab(dabs[i], now)) {
            dabs.splice(i, 1);
          }
        }
        if (dabs.length > 0) {
          rafId = requestAnimationFrame(tick);
        } else {
          rafId = 0;
        }
      };
      rafId = requestAnimationFrame(tick);
    };

    const isBackgroundTarget = (target: EventTarget | null): boolean => {
      const el = target instanceof Element ? target : null;
      return !el?.closest(INTERACTIVE_OR_SURFACE_SELECTOR);
    };

    const addDrop = (x: number, y: number, isTap: boolean) => {
      const now = performance.now();
      if (!lastPoint || now - lastPoint.time > 200 || isTap) {
        totalDistance += isTap ? 42 : 24;
        spawnDab(x, y, 5, 2, 10, now, isTap ? 1.35 : 1);
        lastPoint = { x, y, time: now };
        startLoop();
        return;
      }

      const dx = x - lastPoint.x;
      const dy = y - lastPoint.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 10) return;

      const steps = Math.min(4, Math.max(1, Math.floor(dist / 22)));
      for (let s = 1; s <= steps; s++) {
        const frac = s / steps;
        const sx = lastPoint.x + dx * frac;
        const sy = lastPoint.y + dy * frac;
        totalDistance += dist / steps;
        spawnDab(sx, sy, dx / steps, dy / steps, dist, now, 1);
      }
      lastPoint = { x, y, time: now };
      startLoop();
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isBackgroundTarget(e.target)) {
        lastPoint = null;
        return;
      }
      addDrop(e.clientX, e.clientY, false);
    };

    const onPointerDown = (e: PointerEvent) => {
      if (!isBackgroundTarget(e.target)) {
        lastPoint = null;
        return;
      }
      addDrop(e.clientX, e.clientY, true);
    };

    const onVisibility = () => {
      if (document.hidden && rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      } else if (!document.hidden && dabs.length > 0) {
        startLoop();
      }
    };

    const onContentVisibility = (e: Event) => {
      const cvEvent = e as Event & { skipped?: boolean };
      skippedByContentVis = Boolean(cvEvent.skipped);
      if (skippedByContentVis && rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      } else if (!skippedByContentVis && dabs.length > 0) {
        startLoop();
      }
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    document.addEventListener('contentvisibilityautostatechange', onContentVisibility, {
      capture: true,
    });

    return () => {
      ro.disconnect();
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('visibilitychange', onVisibility);
      document.removeEventListener('contentvisibilityautostatechange', onContentVisibility, {
        capture: true,
      });
    };
  }, [reduce]);

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      <svg width="0" height="0" className="absolute">
        <defs>
          <filter id={filterId} x="-15%" y="-15%" width="130%" height="130%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.026"
              numOctaves="3"
              seed="7"
              result="paperNoise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="paperNoise"
              scale="11"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>
      <canvas
        ref={canvasRef}
        className="h-full w-full mix-blend-multiply"
        style={{ filter: `url(#${filterId}) blur(1px)` }}
      />
    </div>
  );
}
