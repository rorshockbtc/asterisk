import type { DraftAnalysis } from './platforms';

/**
 * Pre-Flight readiness → painted "weather" over the composer.
 * The weather is the first, glanceable signal; detailed checks are progressive disclosure.
 */
export type Weather = 'paper' | 'overcast' | 'dawn' | 'clear';

export const WEATHER: Record<Weather, { label: string; detail: string; wash: string }> = {
  paper: {
    label: 'Blank page',
    detail: 'Start writing and the sky will tell you how it reads.',
    wash: 'radial-gradient(80% 120% at 30% 50%, #F3EEE6 0%, transparent 70%)',
  },
  overcast: {
    label: 'Overcast',
    detail: 'A few things to fix before this flies.',
    wash: 'radial-gradient(70% 140% at 25% 50%, #CFCDD8 0%, #E3E1E8 45%, transparent 78%), radial-gradient(50% 120% at 80% 40%, #C3C4D0 0%, transparent 70%)',
  },
  dawn: {
    label: 'Clearing',
    detail: 'Good to go. A couple of optional touches would help.',
    wash: 'radial-gradient(70% 140% at 25% 50%, #F7B9C9 0%, #FAD6B8 48%, transparent 80%), radial-gradient(50% 120% at 82% 35%, #C9B9E8 0%, transparent 72%)',
  },
  clear: {
    label: 'Clear skies',
    detail: 'Ready to ship.',
    wash: 'radial-gradient(75% 140% at 30% 50%, #A9D3EA 0%, #D2E8F3 50%, transparent 82%), radial-gradient(45% 120% at 85% 60%, #F7B9C9 0%, transparent 72%)',
  },
};

export function readinessToWeather(readiness: DraftAnalysis['readiness']): Weather {
  switch (readiness) {
    case 'fix':
      return 'overcast';
    case 'tune':
      return 'dawn';
    case 'ready':
      return 'clear';
    default:
      return 'paper';
  }
}
