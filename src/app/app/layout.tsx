import React from 'react';
import { StudioProvider } from '@/components/studio/StudioContext';
import StudioShell from '@/components/studio/StudioShell';
import NotesDrawer from '@/components/studio/NotesDrawer';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <StudioProvider>
      <StudioShell>{children}</StudioShell>
      <NotesDrawer />
    </StudioProvider>
  );
}
