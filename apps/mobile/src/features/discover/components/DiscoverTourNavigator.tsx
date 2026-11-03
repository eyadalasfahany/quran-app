import { router } from 'expo-router';
import { useEffect, useRef } from 'react';

import { useDiscoverState } from '../hooks/useDiscover';
import { DISCOVER_HREF, openDiscoverEntry, unwindTourScreens } from '../open';
import { DISCOVER_ENTRIES, type DiscoverId } from '../registry';
import { endTour, lastTourFinished, TOUR_ADVANCE_DELAY_MS } from '../store';

/**
 * Drives the guided tour (ADR 0053, amended 3 Nov 2026). Renders nothing. When the tour's step changes it opens that
 * step's screen: at once when the tour starts, and after TOUR_ADVANCE_DELAY_MS when it moves on from a step. Before a
 * later step opens, the screens opened for earlier steps are closed, so each step replaces the previous one. When the
 * tour runs out of steps those screens are closed and it returns to the Discover list. A tour left over from an earlier
 * launch is ended, so the app never opens on a tip the person did not ask for.
 */
export function DiscoverTourNavigator() {
  const { tourStep } = useDiscoverState();
  const previous = useRef<DiscoverId | null | undefined>(undefined);

  useEffect(() => {
    const before = previous.current;
    previous.current = tourStep;
    if (before === undefined) {
      if (tourStep !== null) {
        endTour();
      }
      return undefined;
    }
    if (tourStep === before) {
      return undefined;
    }
    if (tourStep === null) {
      if (lastTourFinished()) {
        unwindTourScreens();
        router.navigate(DISCOVER_HREF);
      }
      return undefined;
    }
    const entry = DISCOVER_ENTRIES.find((item) => item.id === tourStep);
    if (entry === undefined) {
      return undefined;
    }
    if (before === null) {
      openDiscoverEntry(entry);
      return undefined;
    }
    const timer = setTimeout(() => {
      unwindTourScreens();
      openDiscoverEntry(entry);
    }, TOUR_ADVANCE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [tourStep]);

  return null;
}
