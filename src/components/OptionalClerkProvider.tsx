'use client';

import React from 'react';
import { ClerkProvider } from '@clerk/nextjs';

/**
 * Wraps the app in <ClerkProvider> strictly when a Clerk publishable key is configured.
 * Allows local cloning and `npm run build` with zero Clerk environment secrets.
 */
export default function OptionalClerkProvider({ children }: { children: React.ReactNode }) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!publishableKey) {
    return <>{children}</>;
  }

  const isSatellite = process.env.NEXT_PUBLIC_CLERK_IS_SATELLITE === 'true';
  const domain = process.env.NEXT_PUBLIC_CLERK_DOMAIN || undefined;
  const signInUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || '/login';
  const signUpUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || '/login?intent=signup';

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      {...(isSatellite ? { isSatellite: true, domain } : {})}
      signInUrl={signInUrl}
      signUpUrl={signUpUrl}
    >
      {children}
    </ClerkProvider>
  );
}
