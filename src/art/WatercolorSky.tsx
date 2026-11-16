'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { MotionValue } from 'framer-motion';
import { useMotionPreference } from 'accent-ui/motion';

/**
 * Living watercolor sky (Three.js shader plane).
 *
 * - Domain-warped fbm creates soft wet-in-wet bleeding between washes.
 * - Pigment pools slightly darker along wash boundaries (the "wet edge" of real watercolor).
 * - Cold-press paper grain and granulation are multiplied in.
 * - Pointer gently pushes the wash; `progress` (0..1, e.g. scroll) warms the sky toward dawn.
 * - Renders a single still frame under reduced motion; pauses while offscreen.
 * - Falls back to `fallbackSrc` (painted plate) if WebGL is unavailable.
 */

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uProgress;
  uniform vec2 uPointer;
  uniform vec2 uResolution;
  uniform vec3 uTop;
  uniform vec3 uMid;
  uniform vec3 uLow;
  uniform vec3 uGlow;
  uniform vec3 uPaper;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0; float a = 0.5;
    mat2 r = mat2(0.8, -0.6, 0.6, 0.8);
    for (int i = 0; i < 3; i++) { v += a * noise(p); p = r * p * 2.03 + 11.7; a *= 0.5; }
    return v;
  }

  void main() {
    vec2 uv = vUv;
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    vec2 p = vec2(uv.x * aspect, uv.y);

    // Pointer pushes pigment softly (wet paper responds locally across the whole sky).
    vec2 ptr = vec2(uPointer.x * aspect, uPointer.y);
    float push = exp(-3.6 * distance(p, ptr));

    float t = uTime * 0.02;
    vec2 q = vec2(fbm(p * 1.6 + vec2(0.0, t)), fbm(p * 1.6 + vec2(5.2, -t)));
    vec2 r = vec2(fbm(p * 2.2 + 3.0 * q + vec2(1.7, 9.2) + t),
                  fbm(p * 2.2 + 3.0 * q + vec2(8.3, 2.8) - t));
    float warp = fbm(p * 1.4 + 2.4 * r + push * 0.95);

    // Vertical wash bands, bled by the warp field.
    float h = uv.y + (warp - 0.5) * 0.34 - push * 0.08;
    float dawn = smoothstep(0.0, 1.0, uProgress);
    vec3 col = mix(uLow, uMid, smoothstep(0.08, 0.5, h));
    col = mix(col, uTop, smoothstep(0.46, 0.98, h));

    // Rising dawn glow near the horizon + gentle ripple at the pointer.
    float glow = exp(-pow((uv.y - (0.12 + 0.18 * dawn)) * 4.2, 2.0)) * (0.35 + 0.45 * dawn);
    col = mix(col, uGlow, clamp(glow * (0.55 + 0.45 * warp) + push * 0.22, 0.0, 0.85));

    // Wet-edge pigment pooling along band boundaries.
    float bands = fract(h * 3.2 + warp * 0.8);
    float edge = smoothstep(0.0, 0.035, bands) * (1.0 - smoothstep(0.035, 0.09, bands));
    col *= 1.0 - edge * 0.075;

    // Transparency: keep luminous pastel washes across the full sky including the left third.
    float coverage = smoothstep(0.08, 0.92, warp * 0.72 + (1.0 - uv.y) * 0.42 + 0.18);
    col = mix(uPaper, col, 0.62 + 0.34 * coverage);

    // Granulation + cold-press grain (multiplied, like pigment settling in paper tooth).
    float grain = noise(uv * uResolution * 0.55);
    float gran = noise(p * 60.0 + warp * 4.0);
    col *= 0.975 + 0.025 * grain;
    col *= 0.985 + 0.015 * gran;

    gl_FragColor = vec4(col, 1.0);
  }
`;

function hexToVec(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export interface WatercolorSkyPalette {
  top: string;
  mid: string;
  low: string;
  glow: string;
  paper: string;
}

export const DAWN_PALETTE: WatercolorSkyPalette = {
  top: '#A595D8',
  mid: '#F4C2C2',
  low: '#FBD3B2',
  glow: '#FF7DBA',
  paper: '#FAF8F5',
};

export const TWILIGHT_PALETTE: WatercolorSkyPalette = {
  top: '#2B2252',
  mid: '#5D4B99',
  low: '#DF8EB2',
  glow: '#FE299E',
  paper: '#241E45',
};

export default function WatercolorSky({
  progress = 0,
  palette = DAWN_PALETTE,
  fallbackSrc,
  className = '',
}: {
  progress?: number | MotionValue<number>;
  palette?: WatercolorSkyPalette;
  fallbackSrc?: string;
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(typeof progress === 'number' ? progress : progress.get());
  const [failed, setFailed] = useState(false);
  const { isReduced } = useMotionPreference();

  useEffect(() => {
    if (typeof progress === 'number') {
      progressRef.current = progress;
      return;
    }
    progressRef.current = progress.get();
    return progress.on('change', (v) => {
      progressRef.current = v;
    });
  }, [progress]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let cleanup = () => {};

    (async () => {
      const THREE = await import('three');
      if (disposed) return;

      let renderer: import('three').WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'low-power' });
      } catch {
        setFailed(true);
        return;
      }

      const prefersReduced =
        isReduced || window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      renderer.setPixelRatio(1);
      renderer.domElement.setAttribute('aria-hidden', 'true');
      renderer.domElement.style.display = 'block';
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      host.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      const uniforms = {
        uTime: { value: 0 },
        uProgress: { value: progressRef.current },
        uPointer: { value: new THREE.Vector2(0.72, 0.3) },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uTop: { value: new THREE.Vector3(...hexToVec(palette.top)) },
        uMid: { value: new THREE.Vector3(...hexToVec(palette.mid)) },
        uLow: { value: new THREE.Vector3(...hexToVec(palette.low)) },
        uGlow: { value: new THREE.Vector3(...hexToVec(palette.glow)) },
        uPaper: { value: new THREE.Vector3(...hexToVec(palette.paper)) },
      };
      const material = new THREE.ShaderMaterial({ vertexShader: VERTEX, fragmentShader: FRAGMENT, uniforms });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
      scene.add(mesh);

      const resize = () => {
        const { clientWidth: w, clientHeight: h } = host;
        renderer.setSize(w, h, false);
        uniforms.uResolution.value.set(w, h);
        if (prefersReduced) renderer.render(scene, camera);
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(host);

      const target = new THREE.Vector2(0.72, 0.3);
      const onPointer = (e: PointerEvent) => {
        const rect = host.getBoundingClientRect();
        target.set((e.clientX - rect.left) / rect.width, 1 - (e.clientY - rect.top) / rect.height);
      };
      if (!prefersReduced) window.addEventListener('pointermove', onPointer, { passive: true });

      let visible = true;
      const io = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
      });
      io.observe(host);

      let raf = 0;
      const start = performance.now();
      const loop = () => {
        raf = requestAnimationFrame(loop);
        if (!visible || document.hidden) return;
        uniforms.uTime.value = (performance.now() - start) / 1000;
        uniforms.uPointer.value.lerp(target, 0.04);
        uniforms.uProgress.value += (progressRef.current - uniforms.uProgress.value) * 0.08;
        renderer.render(scene, camera);
      };

      if (prefersReduced) {
        uniforms.uTime.value = 12;
        renderer.render(scene, camera);
      } else {
        loop();
      }

      cleanup = () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        io.disconnect();
        window.removeEventListener('pointermove', onPointer);
        mesh.geometry.dispose();
        material.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    })().catch(() => setFailed(true));

    return () => {
      disposed = true;
      cleanup();
    };
  }, [isReduced, palette]);

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      className={`absolute inset-0 overflow-hidden bg-[var(--wc-paper)] ${className}`}
      style={
        failed && fallbackSrc
          ? { backgroundImage: `url(${fallbackSrc})`, backgroundSize: 'cover', backgroundPosition: 'center' }
          : undefined
      }
    />
  );
}
