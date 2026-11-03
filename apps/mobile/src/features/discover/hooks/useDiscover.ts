import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useSyncExternalStore } from 'react';

import { computeDiscoverProgress, type DiscoverProgress } from '../progress';
import { DISCOVER_ENTRIES, type DiscoverId } from '../registry';
import { getDiscoverSnapshot, markDiscovered, readDiscoverState, subscribeDiscover, type DiscoverState } from '../store';

/** The stored Discover state, re-read whenever it changes. */
export function useDiscoverState(): DiscoverState {
  return useSyncExternalStore(subscribeDiscover, getDiscoverSnapshot, getDiscoverSnapshot);
}

/** The rows, their badges and the card mode, for the Home card and the full screen. */
export function useDiscoverProgress(): DiscoverProgress {
  const state = useDiscoverState();
  return useMemo(() => computeDiscoverProgress(DISCOVER_ENTRIES, state), [state]);
}

/**
 * Ticks a row when its screen gains focus (My Mushaf, Settings). Tab screens stay mounted, so mount alone is not
 * enough. While the guided tour is on this step it does not tick: the step's tip explains the screen, and «التالي»
 * completes it (ADR 0053, amended 3 Nov 2026).
 */
export function useMarkDiscoveredOnFocus(id: DiscoverId): void {
  useFocusEffect(
    useCallback(() => {
      if (readDiscoverState().tourStep !== id) {
        markDiscovered(id);
      }
    }, [id]),
  );
}
