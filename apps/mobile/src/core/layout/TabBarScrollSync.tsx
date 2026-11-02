import { useSegments } from 'expo-router';
import { useEffect } from 'react';

import { tabBarScrollCollapseEnabled } from './tab-bar-scroll-collapse';
import { useTabBarScrollStore } from './tab-bar-scroll-store';
import { useTabRail } from './useTabRail';

/** Keeps tab-bar scroll tracking in sync with the bar's shape and the active tab. Mount once in `MainShell`. */
export function TabBarScrollSync() {
  const enabled = tabBarScrollCollapseEnabled(useTabRail());
  const segments = useSegments();
  const tabKey = segments.join('/');
  const setTracking = useTabBarScrollStore((state) => state.setTracking);
  const reset = useTabBarScrollStore((state) => state.reset);

  useEffect(() => {
    setTracking(enabled);
  }, [enabled, setTracking]);

  useEffect(() => {
    reset();
  }, [tabKey, reset]);

  return null;
}
