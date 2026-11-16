'use client';

import React from 'react';
import { MotionProvider } from 'accent-ui/motion';

/**
 * Client boundary wrapping Accént's MotionProvider (`LazyMotion` + reduced-motion sync)
 * because `accent-ui/dist/index.mjs` omits a top-level `"use client"` banner.
 */
export default function AccentClientShell({ children }: { children: React.ReactNode }) {
  return <MotionProvider>{children}</MotionProvider>;
}
