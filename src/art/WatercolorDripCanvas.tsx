'use client';

import React, { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';

interface Rgb {
  r: number;
  g: number;
  b: number;
}

type DropKind = 'yellow' | 'cyan' | 'rose' | 'water';

interface BloomDrop {
  x: number;
  y: number;
  vx: number;
  vy: number;
  aspect?: number;
  kind: DropKind;
  baseRadius: number;
  maxRadius: number;
  bornAt: number;
  lifeMs: number;
  lobes: number[];
  peakAlpha: number;
  rotation: number;
  customMix?: { core: Rgb; ring: Rgb };
  isBridge?: boolean;
}

interface DripPoint {
  x: number;
  y: number;
}

interface GravityDrip {
  x: number;
  y0: number;
  headX: number;
  headY: number;
  vx: number;
  vy: number;
  terminalVy: number;
  traveled: number;
  seed: number;
  targetLength: number;
  baseWidth: number;
  kind: DropKind;
  startAt: number;
  lifeMs: number;
  trail: DripPoint[];
  poolSpawned: boolean;
}

const DROP_KINDS: DropKind[] = ['yellow', 'cyan', 'rose', 'water'];

function lerpRgb(a: Rgb, b: Rgb, t: number): Rgb {
  const c = Math.max(0, Math.min(1, t));
  return {
    r: Math.round(a.r + (b.r - a.r) * c),
    g: Math.round(a.g + (b.g - a.g) * c),
    b: Math.round(a.b + (b.b - a.b) * c),
  };
}

function sampleBackdropRgb(yNorm: number): Rgb {
  const y = Math.max(0, Math.min(1, yNorm));
  const ceruleanTop: Rgb = { r: 29, g: 78, b: 137 };
  const ceruleanLow: Rgb = { r: 46, g: 134, b: 222 };
  const roseMid: Rgb = { r: 232, g: 67, b: 110 };
  const coralLow: Rgb = { r: 255, g: 107, b: 107 };
  const goldWarm: Rgb = { r: 247, g: 159, b: 31 };
  const goldSun: Rgb = { r: 255, g: 195, b: 18 };

  if (y < 0.36) {
    return lerpRgb(ceruleanTop, ceruleanLow, y / 0.36);
  }
  if (y < 0.56) {
    return lerpRgb(ceruleanLow, roseMid, (y - 0.36) / 0.2);
  }
  if (y < 0.74) {
    return lerpRgb(roseMid, coralLow, (y - 0.56) / 0.18);
  }
  if (y < 0.88) {
    return lerpRgb(coralLow, goldWarm, (y - 0.74) / 0.14);
  }
  return lerpRgb(goldWarm, goldSun, (y - 0.88) / 0.12);
}

/**
 * Perceptual pigment mixing against the local backdrop band.
 * Keeps primary/secondary watercolor interactions luminous (emerald greens,
 * glowing tangerines, ultramarine violets) instead of muddy RGB averages.
 */
function mixPigment(kind: DropKind, yNorm: number): { core: Rgb; ring: Rgb; isWater: boolean } {
  const y = Math.max(0, Math.min(1, yNorm));

  if (kind === 'water') {
    const base = sampleBackdropRgb(y);
    return {
      core: { r: 255, g: 249, b: 232 },
      ring: {
        r: Math.max(12, Math.round(base.r * 0.72)),
        g: Math.max(12, Math.round(base.g * 0.72)),
        b: Math.max(16, Math.round(base.b * 0.78)),
      },
      isWater: true,
    };
  }

  let skyColor: Rgb;
  let midColor: Rgb;
  let lowColor: Rgb;

  if (kind === 'yellow') {
    skyColor = { r: 38, g: 198, b: 138 }; // Yellow + Cerulean -> Luminous Emerald / Viridian
    midColor = { r: 255, g: 132, b: 42 }; // Yellow + Coral/Rose -> Glowing Tangerine
    lowColor = { r: 255, g: 222, b: 74 }; // Yellow + Gold -> Bright Cadmium Sunburst
  } else if (kind === 'cyan') {
    skyColor = { r: 58, g: 212, b: 252 }; // Cyan + Cerulean -> Radiant Azure
    midColor = { r: 124, g: 82, b: 232 }; // Cyan + Rose -> Ultramarine Violet
    lowColor = { r: 34, g: 188, b: 148 }; // Cyan + Gold -> Seafoam Teal
  } else {
    skyColor = { r: 158, g: 78, b: 224 }; // Rose + Cerulean -> Orchid Violet
    midColor = { r: 255, g: 77, b: 124 }; // Rose + Rose -> Luminous Alizarin
    lowColor = { r: 255, g: 94, b: 58 };  // Rose + Gold -> Warm Vermilion
  }

  const blended =
    y < 0.5
      ? lerpRgb(skyColor, midColor, Math.max(0, (y - 0.16) / 0.34))
      : lerpRgb(midColor, lowColor, Math.min(1, (y - 0.5) / 0.38));

  const edge = {
    r: Math.max(8, Math.round(blended.r * 0.82)),
    g: Math.max(8, Math.round(blended.g * 0.82)),
    b: Math.max(12, Math.round(blended.b * 0.86)),
  };

  return { core: blended, ring: edge, isWater: false };
}

/** Perceptual pigment blend when two adjacent wet drops touch and bleed together */
function mixDropPair(a: DropKind, b: DropKind, yNorm: number): { core: Rgb; ring: Rgb } {
  const pair = [a, b].sort().join('+');
  if (pair === 'cyan+yellow') {
    return {
      core: { r: 34, g: 204, b: 132 },
      ring: { r: 20, g: 148, b: 96 },
    };
  }
  if (pair === 'rose+yellow') {
    return {
      core: { r: 255, g: 138, b: 44 },
      ring: { r: 214, g: 88, b: 22 },
    };
  }
  if (pair === 'cyan+rose') {
    return {
      core: { r: 132, g: 86, b: 240 },
      ring: { r: 88, g: 48, b: 192 },
    };
  }
  const partner = a === 'water' ? b : a;
  const partnerMix = mixPigment(partner, yNorm);
  return {
    core: lerpRgb(partnerMix.core, { r: 255, g: 248, b: 232 }, 0.45),
    ring: partnerMix.ring,
  };
}

/**
 * Interactive watercolor droplet, radial spatter fleck, and gravity-drip canvas.
 * - Drops discrete blooms and velocity-driven brush flecks rather than continuous ribbons.
 * - Stationary brush holds drip a loaded bead every ~420ms.
 * - Main drops detach gravity drip runners that wander downward along paper fibers.
 */
export default function WatercolorDripCanvas({
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
    let lastTick = performance.now();
    let kindCursor = 0;
    let accumDist = 0;
    let motionAccum = 0;
    let distThreshold = 38;
    let motionThreshold = 11;
    let lastPointer: { x: number; y: number; time: number } | null = null;
    let stationarySince = 0;
    let lastHeldDripAt = 0;
    let pointerInside = false;
    let visible = false;
    let seededIntro = false;

    const blooms: BloomDrop[] = [];
    const drips: GravityDrip[] = [];

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

    const nextKind = (): DropKind => {
      const kind = DROP_KINDS[kindCursor % DROP_KINDS.length];
      kindCursor += 1;
      return kind;
    };

    const makeLobes = (count: number, minScale = 0.78, range = 0.44): number[] => {
      const lobes: number[] = [];
      for (let i = 0; i < count; i++) {
        lobes.push(minScale + Math.random() * range);
      }
      return lobes;
    };

    const pushBloom = (bloom: BloomDrop) => {
      if (blooms.length > 260) {
        blooms.splice(0, blooms.length - 260);
      }
      blooms.push(bloom);
    };

    const pushDrip = (drip: GravityDrip) => {
      if (drips.length > 60) {
        drips.splice(0, drips.length - 60);
      }
      drips.push(drip);
    };

    const spawnMotionBead = (
      x: number,
      y: number,
      angle: number,
      speed: number,
      vxInit: number,
      vyInit: number,
      now: number
    ) => {
      const kind = DROP_KINDS[kindCursor % DROP_KINDS.length];
      const baseR = 4.5 + Math.min(speed * 0.14, 5.5) + Math.random() * 2.5;
      const aspect = Math.min(2.4, 1.6 + Math.min(speed * 0.03, 0.8));
      pushBloom({
        x: x + (Math.random() - 0.5) * 3,
        y: y + (Math.random() - 0.5) * 3,
        vx: Math.max(-2.6, Math.min(2.6, vxInit * 0.16)),
        vy: Math.max(-2.6, Math.min(2.6, vyInit * 0.16)),
        aspect,
        kind,
        baseRadius: baseR,
        maxRadius: baseR * (2.15 + Math.random() * 0.45),
        bornAt: now,
        lifeMs: 6500 + Math.random() * 2000,
        lobes: makeLobes(10, 0.82, 0.34),
        peakAlpha: kind === 'water' ? 0.3 : 0.36,
        rotation: angle + (Math.random() - 0.5) * 0.22,
      });
    };

    const spawnCluster = (
      x: number,
      y: number,
      angle: number,
      speed: number,
      now: number,
      heavy = false,
      vxInit = 0,
      vyInit = 0
    ) => {
      const kind = nextKind();
      const baseR = heavy ? 18 + Math.random() * 10 : 12 + Math.min(speed * 0.22, 10) + Math.random() * 7;
      const maxR = baseR * (heavy ? 3.25 + Math.random() * 0.75 : 3.1 + Math.random() * 0.9);

      // Wet-in-wet neighbor mixing: if near an active drop of a different kind, bleed a bridge bloom
      let bridgesSpawned = 0;
      for (let i = blooms.length - 1; i >= 0 && bridgesSpawned < 2; i--) {
        const existing = blooms[i];
        if (existing.isBridge || existing.kind === kind || existing.baseRadius < 8) continue;
        if (now - existing.bornAt > existing.lifeMs * 0.8) continue;
        const dist = Math.hypot(x - existing.x, y - existing.y);
        if (dist < existing.maxRadius * 1.45) {
          bridgesSpawned += 1;
          const midX = (x + existing.x) * 0.5;
          const midY = (y + existing.y) * 0.5;
          const bridgeBase = (baseR + existing.baseRadius) * 0.58;
          pushBloom({
            x: midX,
            y: midY,
            vx: (vxInit + existing.vx) * 0.08,
            vy: (vyInit + existing.vy) * 0.08,
            kind,
            baseRadius: bridgeBase,
            maxRadius: bridgeBase * (2.9 + Math.random() * 0.7),
            bornAt: now + 90,
            lifeMs: 11000 + Math.random() * 2500,
            lobes: makeLobes(12, 0.78, 0.46),
            peakAlpha: 0.42,
            rotation: Math.random() * Math.PI * 2,
            customMix: mixDropPair(kind, existing.kind, midY / Math.max(height, 1)),
            isBridge: true,
          });
        }
      }

      pushBloom({
        x,
        y,
        vx: Math.max(-2.2, Math.min(2.2, vxInit * 0.14)),
        vy: Math.max(-2.2, Math.min(2.2, vyInit * 0.14)),
        kind,
        baseRadius: baseR,
        maxRadius: maxR,
        bornAt: now,
        lifeMs: 11500 + Math.random() * 3000,
        lobes: makeLobes(12),
        peakAlpha: kind === 'water' ? 0.46 : heavy ? 0.58 : 0.5,
        rotation: Math.random() * Math.PI * 2,
      });

      // Radial brush-fleck spatter thrown ahead in velocity direction
      const fleckCount = heavy ? 4 + Math.floor(Math.random() * 3) : 2 + Math.floor(Math.random() * 5);
      for (let i = 0; i < fleckCount; i++) {
        const spreadAngle = angle + (Math.random() - 0.5) * 1.7;
        const reach = (18 + Math.min(speed * 1.4, 58)) * (0.45 + Math.random() * 0.95);
        const fx = x + Math.cos(spreadAngle) * reach + (Math.random() - 0.5) * 14;
        const fy = y + Math.sin(spreadAngle) * reach + (Math.random() - 0.5) * 14;
        const fr = 2.5 + Math.random() * 5.2;
        const fKind = Math.random() < 0.28 ? DROP_KINDS[(kindCursor + i) % DROP_KINDS.length] : kind;

        pushBloom({
          x: fx,
          y: fy,
          vx: Math.cos(spreadAngle) * (0.18 + Math.min(speed * 0.04, 0.9)),
          vy: Math.sin(spreadAngle) * (0.18 + Math.min(speed * 0.04, 0.9)),
          kind: fKind,
          baseRadius: fr,
          maxRadius: fr * (2.3 + Math.random() * 0.85),
          bornAt: now + 25 + i * 28,
          lifeMs: 8500 + Math.random() * 2500,
          lobes: makeLobes(10, 0.74, 0.5),
          peakAlpha: 0.44 + Math.random() * 0.14,
          rotation: Math.random() * Math.PI * 2,
        });
      }

      // Detach a gesture-carried gravity drip runner (arcs along cursor velocity then falls downward)
      const startY = Math.min(height - 16, y + baseR * 0.42);
      if (startY < height - 24) {
        const terminalVy = (heavy ? 1.35 : 0.95) + Math.random() * 1.05;
        pushDrip({
          x,
          y0: startY,
          headX: x,
          headY: startY,
          vx: Math.max(-4.2, Math.min(4.2, vxInit * 0.42)),
          vy: Math.max(-2.2, Math.min(3.4, vyInit * 0.26 + terminalVy * 0.65)),
          terminalVy,
          traveled: 0,
          seed: Math.random() * 100,
          targetLength: (heavy ? 135 : 90) + Math.random() * 125,
          baseWidth: heavy ? 4.4 + Math.random() * 2.4 : 3.0 + Math.random() * 2.2,
          kind,
          startAt: now + 180 + Math.random() * 90,
          lifeMs: 12000 + Math.random() * 3000,
          trail: [{ x, y: startY }],
          poolSpawned: false,
        });
      }
    };

    const drawBloom = (b: BloomDrop, now: number, dtFrames: number): boolean => {
      const age = now - b.bornAt;
      if (age >= b.lifeMs) return false;
      if (age < 0) return true;

      // Advect wet pigment slightly under wake/gesture momentum
      if (Math.abs(b.vx) > 0.004 || Math.abs(b.vy) > 0.004) {
        b.x = Math.max(4, Math.min(width - 4, b.x + b.vx * dtFrames));
        b.y = Math.max(4, Math.min(height - 4, b.y + b.vy * dtFrames));
        const drag = Math.pow(0.9, dtFrames);
        b.vx *= drag;
        b.vy *= drag;
      }

      const t = age / b.lifeMs;
      // Fast capillary expansion over first ~950ms, then continuous slow outward bleed (+35%)
      const spreadT = Math.min(1, age / 950);
      const fastEase = 1 - Math.pow(1 - spreadT, 2.8);
      const slowDrift = spreadT >= 1 ? ((t - 950 / b.lifeMs) / Math.max(0.01, 1 - 950 / b.lifeMs)) * 0.35 : 0;
      const radius = b.baseRadius + (b.maxRadius - b.baseRadius) * Math.min(1.35, fastEase + slowDrift);

      const fadeIn = Math.min(1, age / 110);
      const fadeOut = t > 0.68 ? Math.pow(1 - (t - 0.68) / 0.32, 1.35) : 1;
      const alpha = b.peakAlpha * fadeIn * fadeOut;
      if (alpha <= 0.004) return true;

      const yNorm = b.y / Math.max(height, 1);
      const { core, ring, isWater } = b.customMix
        ? { ...b.customMix, isWater: false }
        : mixPigment(b.kind, yNorm);

      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.rotation);
      if (b.aspect && b.aspect !== 1) {
        ctx.scale(b.aspect, 1);
      }

      const grad = ctx.createRadialGradient(0, 0, radius * 0.06, 0, 0, radius);
      if (isWater) {
        // Pure water pushes pigment outward into a bright center + darker cauliflower rim
        grad.addColorStop(0, `rgba(${core.r}, ${core.g}, ${core.b}, ${(alpha * 0.62).toFixed(4)})`);
        grad.addColorStop(0.55, `rgba(${core.r}, ${core.g}, ${core.b}, ${(alpha * 0.25).toFixed(4)})`);
        grad.addColorStop(0.76, `rgba(${ring.r}, ${ring.g}, ${ring.b}, ${(alpha * 0.85).toFixed(4)})`);
        grad.addColorStop(0.9, `rgba(${ring.r}, ${ring.g}, ${ring.b}, ${(alpha * 0.38).toFixed(4)})`);
        grad.addColorStop(1, `rgba(${ring.r}, ${ring.g}, ${ring.b}, 0)`);
      } else {
        // Cauliflower watercolor bloom: luminous interior + rich wet-edge pigment ring
        grad.addColorStop(0, `rgba(${core.r}, ${core.g}, ${core.b}, ${(alpha * 0.45).toFixed(4)})`);
        grad.addColorStop(0.62, `rgba(${core.r}, ${core.g}, ${core.b}, ${(alpha * 0.58).toFixed(4)})`);
        grad.addColorStop(0.78, `rgba(${ring.r}, ${ring.g}, ${ring.b}, ${(alpha * 0.96).toFixed(4)})`);
        grad.addColorStop(0.91, `rgba(${ring.r}, ${ring.g}, ${ring.b}, ${(alpha * 0.45).toFixed(4)})`);
        grad.addColorStop(1, `rgba(${ring.r}, ${ring.g}, ${ring.b}, 0)`);
      }

      ctx.fillStyle = grad;
      ctx.beginPath();
      const n = b.lobes.length;
      const pts: DripPoint[] = [];
      for (let i = 0; i < n; i++) {
        const theta = (i / n) * Math.PI * 2;
        const pulse = Math.sin(t * 2.5 + i * 1.9) * 0.05;
        const r = radius * (b.lobes[i] + pulse);
        pts.push({ x: Math.cos(theta) * r, y: Math.sin(theta) * r });
      }
      for (let i = 0; i < n; i++) {
        const curr = pts[i];
        const next = pts[(i + 1) % n];
        const mx = (curr.x + next.x) * 0.5;
        const my = (curr.y + next.y) * 0.5;
        if (i === 0) {
          const prev = pts[n - 1];
          ctx.moveTo((prev.x + curr.x) * 0.5, (prev.y + curr.y) * 0.5);
        }
        ctx.quadraticCurveTo(curr.x, curr.y, mx, my);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      return true;
    };

    const drawDrip = (d: GravityDrip, now: number, dtFrames: number): boolean => {
      const elapsed = now - d.startAt;
      if (elapsed < 0) return true;
      if (elapsed >= d.lifeMs) return false;

      const running = d.traveled < d.targetLength && d.headY < height - 10;

      if (running) {
        d.vx *= Math.pow(0.92, dtFrames);
        d.vy += (d.terminalVy - d.vy) * Math.min(1, 0.08 * dtFrames);
        const stepX =
          d.vx * dtFrames + Math.sin(d.headY * 0.09 + d.seed) * 0.42 * dtFrames;
        const stepY = d.vy * dtFrames;
        const nextX = Math.max(8, Math.min(width - 8, d.headX + stepX));
        const nextY = Math.max(8, Math.min(height - 8, d.headY + stepY));
        d.traveled += Math.hypot(nextX - d.headX, nextY - d.headY);
        d.headX = nextX;
        d.headY = nextY;

        const lastPt = d.trail[d.trail.length - 1];
        if (!lastPt || Math.hypot(nextX - lastPt.x, nextY - lastPt.y) >= 3) {
          d.trail.push({ x: nextX, y: nextY });
        }
      } else if (!d.poolSpawned) {
        d.poolSpawned = true;
        const poolR = d.baseWidth * 1.85 + 5;
        pushBloom({
          x: d.headX,
          y: d.headY,
          vx: 0,
          vy: 0,
          kind: d.kind,
          baseRadius: poolR,
          maxRadius: poolR * 2.6,
          bornAt: now,
          lifeMs: Math.max(5200, d.lifeMs - elapsed),
          lobes: makeLobes(10, 0.8, 0.36),
          peakAlpha: 0.52,
          rotation: Math.random() * Math.PI * 2,
        });
      }

      const lifeT = elapsed / d.lifeMs;
      const alpha = 0.62 * (lifeT > 0.68 ? Math.pow(1 - (lifeT - 0.68) / 0.32, 1.35) : 1);
      if (alpha <= 0.005 || d.trail.length < 2) return true;

      // Draw tapered rivulet shifting color dynamically as it enters lower horizon bands
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const segCount = d.trail.length - 1;
      for (let i = 0; i < segCount; i++) {
        const p0 = d.trail[i];
        const p1 = d.trail[i + 1];
        const progress = i / Math.max(1, segCount);
        const midYNorm = ((p0.y + p1.y) * 0.5) / Math.max(height, 1);
        const { core, ring } = mixPigment(d.kind, midYNorm);
        const segColor = lerpRgb(core, ring, 0.35);

        ctx.strokeStyle = `rgba(${segColor.r}, ${segColor.g}, ${segColor.b}, ${(alpha * (0.55 + progress * 0.45)).toFixed(4)})`;
        ctx.lineWidth = Math.max(1.4, d.baseWidth * (0.45 + 0.55 * (1 - progress * 0.45)));
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
      }

      // Hanging pigment teardrop bead at the leading edge while trickling downward
      const { core, ring } = mixPigment(d.kind, d.headY / Math.max(height, 1));
      const beadR = d.baseWidth * (running ? 0.92 : 0.72);
      const beadGrad = ctx.createRadialGradient(
        d.headX,
        d.headY - beadR * 0.15,
        beadR * 0.1,
        d.headX,
        d.headY,
        beadR * 1.45
      );
      beadGrad.addColorStop(0, `rgba(${core.r}, ${core.g}, ${core.b}, ${(alpha * 0.85).toFixed(4)})`);
      beadGrad.addColorStop(0.7, `rgba(${ring.r}, ${ring.g}, ${ring.b}, ${alpha.toFixed(4)})`);
      beadGrad.addColorStop(1, `rgba(${ring.r}, ${ring.g}, ${ring.b}, 0)`);

      ctx.fillStyle = beadGrad;
      ctx.beginPath();
      ctx.ellipse(d.headX, d.headY, beadR * 1.05, beadR * 1.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return true;
    };

    const startLoop = () => {
      if (rafId) return;
      lastTick = performance.now();
      const tick = (now: number) => {
        const dtFrames = Math.min(2.5, Math.max(0.25, (now - lastTick) / 16.67));
        lastTick = now;

        // Held wet brush drip: if pointer pauses inside section, drip every ~420ms
        if (pointerInside && lastPointer && now - stationarySince > 360 && now - lastHeldDripAt > 420) {
          lastHeldDripAt = now;
          spawnCluster(
            lastPointer.x + (Math.random() - 0.5) * 10,
            lastPointer.y + (Math.random() - 0.5) * 10,
            Math.PI * 0.5,
            8,
            now,
            true
          );
        }

        ctx.clearRect(0, 0, width, height);

        for (let i = blooms.length - 1; i >= 0; i--) {
          if (!drawBloom(blooms[i], now, dtFrames)) {
            blooms.splice(i, 1);
          }
        }
        for (let i = drips.length - 1; i >= 0; i--) {
          if (!drawDrip(drips[i], now, dtFrames)) {
            drips.splice(i, 1);
          }
        }

        if (blooms.length > 0 || drips.length > 0 || pointerInside) {
          rafId = requestAnimationFrame(tick);
        } else {
          rafId = 0;
        }
      };
      rafId = requestAnimationFrame(tick);
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

    const applyCursorMove = (x: number, y: number, isTouch = false) => {
      const now = performance.now();

      if (!lastPointer) {
        lastPointer = { x, y, time: now };
        stationarySince = now;
        lastHeldDripAt = now;
        spawnCluster(x, y, Math.PI * 0.35, 14, now, false, 0.8, 0.5);
        startLoop();
        return;
      }

      const dx = x - lastPointer.x;
      const dy = y - lastPointer.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 2) {
        stationarySince = now;
      }
      if (dist < 1) {
        startLoop();
        return;
      }

      const dt = Math.max(8, now - lastPointer.time);
      const speed = (dist / dt) * 16.67;
      const vxNorm = (dx / dt) * 16.67;
      const vyNorm = (dy / dt) * 16.67;
      const angle = Math.atan2(dy, dx);

      // Fluid wake advection: passing cursor nudges nearby wet blooms and falling drip arcs
      const wakeRadius = 135;
      for (let i = 0; i < blooms.length; i++) {
        const b = blooms[i];
        const distToBloom = Math.hypot(b.x - x, b.y - y);
        if (distToBloom < wakeRadius) {
          const falloff = Math.pow(1 - distToBloom / wakeRadius, 2);
          b.vx = Math.max(-3.5, Math.min(3.5, b.vx + vxNorm * 0.14 * falloff));
          b.vy = Math.max(-3.5, Math.min(3.5, b.vy + vyNorm * 0.14 * falloff));
        }
      }
      for (let i = 0; i < drips.length; i++) {
        const d = drips[i];
        if (d.traveled >= d.targetLength) continue;
        const distToHead = Math.hypot(d.headX - x, d.headY - y);
        if (distToHead < wakeRadius) {
          const falloff = Math.pow(1 - distToHead / wakeRadius, 2);
          d.vx = Math.max(-4.5, Math.min(4.5, d.vx + vxNorm * 0.16 * falloff));
          d.vy = Math.max(-2.5, Math.min(4.2, d.vy + vyNorm * 0.1 * falloff));
        }
      }

      // Live brush-tip wet filament tracking the exact cursor path
      motionAccum += dist;
      if (motionAccum >= motionThreshold) {
        spawnMotionBead(x, y, angle, speed, vxNorm, vyNorm, now);
        motionAccum = 0;
        motionThreshold = 10 + Math.random() * 4;
      }

      // Periodic main droplet + spatter fleck + gravity drip runner
      accumDist += dist;
      if (accumDist >= distThreshold) {
        spawnCluster(x, y, angle, speed, now, false, vxNorm, vyNorm);
        accumDist = 0;
        distThreshold = (isTouch ? 36 : 32) + Math.random() * 23;
      }

      lastPointer = { x, y, time: now };
      startLoop();
    };

    const onPointerMove = (e: PointerEvent) => {
      const pt = toLocal(e.clientX, e.clientY);
      if (!pt.inside) {
        pointerInside = false;
        lastPointer = null;
        return;
      }
      pointerInside = true;
      applyCursorMove(pt.x, pt.y, false);
    };

    const onPointerDown = (e: PointerEvent) => {
      const pt = toLocal(e.clientX, e.clientY);
      if (!pt.inside) return;
      pointerInside = true;
      const now = performance.now();
      lastPointer = { x: pt.x, y: pt.y, time: now };
      stationarySince = now;
      lastHeldDripAt = now;
      spawnCluster(pt.x, pt.y, Math.PI * 0.45, 20, now, true);
      startLoop();
    };

    const onPointerLeave = () => {
      pointerInside = false;
      lastPointer = null;
      accumDist = 0;
      motionAccum = 0;
    };

    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      const pt = toLocal(touch.clientX, touch.clientY);
      if (!pt.inside) return;
      applyCursorMove(pt.x, pt.y, true);
    };

    const seedAmbientClusters = () => {
      if (seededIntro) return;
      seededIntro = true;
      const now = performance.now();
      const spots = [
        { rx: 0.58, ry: 0.24, delay: 80 },
        { rx: 0.72, ry: 0.42, delay: 420 },
        { rx: 0.85, ry: 0.28, delay: 780 },
      ];
      for (const s of spots) {
        spawnCluster(width * s.rx, height * s.ry, Math.PI * 0.42, 24, now + s.delay, true);
      }
      startLoop();
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) {
          seedAmbientClusters();
          if (blooms.length > 0 || drips.length > 0) startLoop();
        }
      },
      { threshold: 0.15 }
    );
    io.observe(container);

    container.addEventListener('pointermove', onPointerMove, { passive: true });
    container.addEventListener('pointerdown', onPointerDown, { passive: true });
    container.addEventListener('pointerleave', onPointerLeave, { passive: true });
    container.addEventListener('touchmove', onTouchMove, { passive: true });

    return () => {
      ro.disconnect();
      io.disconnect();
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
          <filter id="closing-drip-bleed" x="-15%" y="-15%" width="130%" height="130%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.032"
              numOctaves="3"
              seed="7"
              result="paperGrain"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="paperGrain"
              scale="11"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>
      <canvas
        ref={canvasRef}
        className="h-full w-full"
        style={{ filter: 'url(#closing-drip-bleed) blur(0.6px)' }}
      />
    </div>
  );
}
