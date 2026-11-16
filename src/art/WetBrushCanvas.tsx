'use client';

import React, { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';

interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** Folon dawn & twilight watercolor pigments */
const PIGMENTS: Rgb[] = [
  { r: 254, g: 41, b: 158 },  // Twilight Rose
  { r: 108, g: 92, b: 231 },  // Ultramarine Violet
  { r: 244, g: 152, b: 108 }, // Dawn Apricot
  { r: 66, g: 158, b: 226 },  // Cerulean Sky
  { r: 186, g: 104, b: 216 }, // Soft Orchid
];

interface BrushDab {
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
  lobes: number[];
  peakAlpha: number;
}

function lerpColor(a: Rgb, b: Rgb, t: number): Rgb {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  };
}

function samplePalette(distance: number): Rgb {
  const cycle = (distance / 260) % PIGMENTS.length;
  const idx = Math.floor(cycle);
  const next = (idx + 1) % PIGMENTS.length;
  const frac = cycle - idx;
  return lerpColor(PIGMENTS[idx], PIGMENTS[next], frac);
}

/**
 * Interactive wet-on-wet watercolor brushstroke layer for the Colophon hero.
 * - Never alters or hides the user's native cursor.
 * - Responds to mouse movement (`pointermove`) and thumb touch/drag (`pointerdown`, `pointermove`)
 *   while keeping `touch-action: pan-y` on the parent section so vertical page scrolling stays natural.
 * - Each stroke spreads outward like capillary water into cotton paper, shifts gently through
 *   Folon pigments, and disperses back into clean paper over ~3.8 seconds.
 */
export default function WetBrushCanvas({
  containerRef,
}: {
  containerRef: React.RefObject<HTMLElement | null>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) return;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let rafId = 0;
    let totalDistance = 0;
    let lastPoint: { x: number; y: number; time: number } | null = null;
    const dabs: BrushDab[] = [];

    const resize = () => {
      const rect = container.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    const spawnDab = (
      x: number,
      y: number,
      dx: number,
      dy: number,
      speed: number,
      now: number,
      boost = 1
    ) => {
      if (dabs.length > 220) {
        dabs.splice(0, dabs.length - 220);
      }

      const angle = Math.atan2(dy, dx);
      const color = samplePalette(totalDistance);
      const clampSpeed = Math.min(speed, 48);
      const baseRadius = (22 + clampSpeed * 0.55 + Math.random() * 12) * boost;

      const lobes: number[] = [];
      const count = 9;
      for (let i = 0; i < count; i++) {
        lobes.push(0.76 + Math.random() * 0.46);
      }

      dabs.push({
        x: x + (Math.random() - 0.5) * 8,
        y: y + (Math.random() - 0.5) * 8,
        vx: dx * 0.04 + (Math.random() - 0.5) * 0.35,
        vy: dy * 0.04 + (Math.random() - 0.5) * 0.35 - 0.08,
        angle: angle + (Math.random() - 0.5) * 0.35,
        baseRadius,
        maxSpread: 1.75 + Math.random() * 0.45,
        aspect: 1.25 + Math.min(clampSpeed / 38, 0.85),
        color,
        bornAt: now,
        lifeMs: 3400 + Math.random() * 900,
        lobes,
        peakAlpha: 0.095 + Math.random() * 0.045,
      });
    };

    const drawDab = (dab: BrushDab, now: number): boolean => {
      const age = now - dab.bornAt;
      if (age >= dab.lifeMs) return false;
      if (age < 0) return true;

      const t = age / dab.lifeMs;
      // Fast wet capillary bloom in the first 40%, gentle dispersion afterward
      const spreadEase = 1 - Math.pow(1 - t, 2.4);
      const radius = dab.baseRadius * (1 + (dab.maxSpread - 1) * spreadEase);

      // Smooth fade-in (first 8%) then slow watercolor evaporation
      const fadeIn = Math.min(1, t / 0.08);
      const fadeOut = Math.pow(1 - t, 1.65);
      const alpha = dab.peakAlpha * fadeIn * fadeOut;
      if (alpha <= 0.003) return true;

      const driftFrames = age / 16.67;
      const cx = dab.x + dab.vx * driftFrames * 0.35;
      const cy = dab.y + dab.vy * driftFrames * 0.35;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(dab.angle);
      ctx.scale(dab.aspect * (1 - t * 0.18), 1 + t * 0.12);

      const { r, g, b } = dab.color;
      const grad = ctx.createRadialGradient(0, 0, radius * 0.08, 0, 0, radius);
      // Authentic watercolor "cauliflower / pigment ring": soft center, slightly richer wet rim, feathered edge
      grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${(alpha * 0.72).toFixed(4)})`);
      grad.addColorStop(0.58, `rgba(${r}, ${g}, ${b}, ${(alpha * 0.95).toFixed(4)})`);
      grad.addColorStop(0.82, `rgba(${r}, ${g}, ${b}, ${(alpha * 0.55).toFixed(4)})`);
      grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

      ctx.fillStyle = grad;
      ctx.beginPath();
      const n = dab.lobes.length;
      const points: Array<{ x: number; y: number }> = [];
      for (let i = 0; i < n; i++) {
        const theta = (i / n) * Math.PI * 2;
        const wobble = dab.lobes[i] + Math.sin(t * 3.2 + i * 1.7) * 0.08;
        const rr = radius * wobble;
        points.push({ x: Math.cos(theta) * rr, y: Math.sin(theta) * rr });
      }
      for (let i = 0; i < n; i++) {
        const curr = points[i];
        const next = points[(i + 1) % n];
        const midX = (curr.x + next.x) * 0.5;
        const midY = (curr.y + next.y) * 0.5;
        if (i === 0) {
          const prev = points[n - 1];
          ctx.moveTo((prev.x + curr.x) * 0.5, (prev.y + curr.y) * 0.5);
        }
        ctx.quadraticCurveTo(curr.x, curr.y, midX, midY);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      return true;
    };

    const startLoop = () => {
      if (rafId) return;
      const tick = (now: number) => {
        ctx.clearRect(0, 0, width, height);
        ctx.globalCompositeOperation = 'multiply';
        for (let i = dabs.length - 1; i >= 0; i--) {
          const alive = drawDab(dabs[i], now);
          if (!alive) {
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

    const addStrokeTo = (x: number, y: number, isInitialTap = false) => {
      const now = performance.now();
      if (!lastPoint || now - lastPoint.time > 180 || isInitialTap) {
        totalDistance += 28;
        spawnDab(x, y, 6, -3, 12, now, isInitialTap ? 1.2 : 1);
        lastPoint = { x, y, time: now };
        startLoop();
        return;
      }

      const dx = x - lastPoint.x;
      const dy = y - lastPoint.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 6) return;

      const steps = Math.min(8, Math.max(1, Math.floor(dist / 14)));
      for (let s = 1; s <= steps; s++) {
        const frac = s / steps;
        const sx = lastPoint.x + dx * frac;
        const sy = lastPoint.y + dy * frac;
        totalDistance += dist / steps;
        spawnDab(sx, sy, dx / steps, dy / steps, dist, now);
      }
      lastPoint = { x, y, time: now };
      startLoop();
    };

    const toLocal = (clientX: number, clientY: number) => {
      const rect = container.getBoundingClientRect();
      return {
        x: clientX - rect.left,
        y: clientY - rect.top,
        inside:
          clientX >= rect.left &&
          clientX <= rect.right &&
          clientY >= rect.top &&
          clientY <= rect.bottom,
      };
    };

    const onPointerMove = (e: PointerEvent) => {
      const pt = toLocal(e.clientX, e.clientY);
      if (!pt.inside) {
        lastPoint = null;
        return;
      }
      addStrokeTo(pt.x, pt.y, false);
    };

    const onPointerDown = (e: PointerEvent) => {
      const pt = toLocal(e.clientX, e.clientY);
      if (!pt.inside) return;
      addStrokeTo(pt.x, pt.y, true);
    };

    const onPointerLeave = () => {
      lastPoint = null;
    };

    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      const pt = toLocal(touch.clientX, touch.clientY);
      if (!pt.inside) return;
      addStrokeTo(pt.x, pt.y, false);
    };

    container.addEventListener('pointermove', onPointerMove, { passive: true });
    container.addEventListener('pointerdown', onPointerDown, { passive: true });
    container.addEventListener('pointerleave', onPointerLeave, { passive: true });
    container.addEventListener('touchmove', onTouchMove, { passive: true });

    // Gentle introductory stroke across the upper-right negative space on mount
    const introBase = performance.now() + 180;
    const startX = width * 0.62;
    const startY = height * 0.28;
    for (let i = 0; i < 9; i++) {
      totalDistance += 34;
      spawnDab(
        startX + i * (width * 0.028),
        startY + Math.sin(i * 0.55) * 22 - i * 4,
        16,
        -4,
        22,
        introBase + i * 55,
        1.15
      );
    }
    startLoop();

    return () => {
      ro.disconnect();
      if (rafId) cancelAnimationFrame(rafId);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('pointerleave', onPointerLeave);
      container.removeEventListener('touchmove', onTouchMove);
    };
  }, [containerRef, reduce]);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <svg width="0" height="0" className="absolute">
        <defs>
          <filter id="colophon-wet-bleed" x="-15%" y="-15%" width="130%" height="130%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.028"
              numOctaves="3"
              seed="11"
              result="paperNoise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="paperNoise"
              scale="14"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>
      <canvas
        ref={canvasRef}
        className="h-full w-full mix-blend-multiply"
        style={{ filter: 'url(#colophon-wet-bleed) blur(1.5px)' }}
      />
    </div>
  );
}
