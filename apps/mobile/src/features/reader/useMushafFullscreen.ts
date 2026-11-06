import { useEffect, useState } from 'react';
import { BackHandler } from 'react-native';

import { setAndroidNavigationBarHidden } from './android-navigation-bar';
import type { ReaderMode } from './anchor/reading-anchor';

// Mushaf full screen (ADR 0071). Not persisted: each reader opens with the controls showing, and leaving Mushaf
// ends it. The system back action exits it instead of leaving the reader.
export function useMushafFullscreen(mode: ReaderMode): { fullscreen: boolean; enter: () => void; exit: () => void } {
  const [active, setActive] = useState(false);
  // Leaving Mushaf clears the state during render, so returning to Mushaf does not re-enter (same pattern as pinMode).
  const [activeMode, setActiveMode] = useState(mode);
  if (activeMode !== mode) {
    setActiveMode(mode);
    setActive(false);
  }
  const fullscreen = active && mode === 'mushaf';

  useEffect(() => {
    if (!fullscreen) {
      return undefined;
    }
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setActive(false);
      return true;
    });
    return () => {
      subscription.remove();
    };
  }, [fullscreen]);

  // Android's navigation bar follows full screen. Its cleanup shows the bar again on exit and on unmount.
  useEffect(() => {
    if (!fullscreen) {
      return undefined;
    }
    setAndroidNavigationBarHidden(true);
    return () => {
      setAndroidNavigationBarHidden(false);
    };
  }, [fullscreen]);

  return { enter: () => setActive(true), exit: () => setActive(false), fullscreen };
}
