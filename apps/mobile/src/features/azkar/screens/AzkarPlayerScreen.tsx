import { useEffect } from 'react';

import { SheetHost } from '@/features/reader/components/SheetHost';

import { useAzkarPlayerStore } from '../audio/azkarPlayerStore';
import { AzkarPlayerBody } from '../components/AzkarPlayerBody';
import { azkarHref, goBackOr } from '../routes';

/**
 * The full Azkar player (ADR 0031 §8), a reader sheet over the reader. It needs a playing scope: when nothing is queued
 * (stopped, or the reader was left), it leaves the route rather than showing an empty sheet.
 */
export function AzkarPlayerScreen() {
  const active = useAzkarPlayerStore((state) => state.scope !== null && state.queue.length > 0);

  useEffect(() => {
    if (!active) {
      goBackOr(azkarHref.home);
    }
  }, [active]);

  if (!active) {
    return null;
  }

  return (
    <SheetHost testID="azkar-player-sheet">
      <AzkarPlayerBody />
    </SheetHost>
  );
}
