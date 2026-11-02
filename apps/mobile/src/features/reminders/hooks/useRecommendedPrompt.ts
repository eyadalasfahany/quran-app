import { router, type Href } from 'expo-router';
import { useEffect, useRef } from 'react';

import { isRecommendedSetDue, markRecommendedSetShown } from '../data/recommended';

/** The recommended-set sheet's route (`app/reminders/recommended.tsx`). */
export const RECOMMENDED_ROUTE = '/reminders/recommended' as Href;

/**
 * Offers the recommended set once, on the first visit to the hub with notifications allowed and nothing turned on yet
 * (ADR 0034 amendment, 2 Nov 2026). The sheet is only shown; nothing is scheduled until the user taps its button. The
 * offer is recorded as soon as it is shown, so it never comes back whatever the user chooses.
 */
export function useRecommendedPrompt(granted: boolean | null): void {
  const offered = useRef(false);
  useEffect(() => {
    if (granted !== true || offered.current || !isRecommendedSetDue()) {
      return;
    }
    offered.current = true;
    markRecommendedSetShown();
    router.push(RECOMMENDED_ROUTE);
  }, [granted]);
}
