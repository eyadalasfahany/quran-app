import { useEffect, type RefObject } from 'react';
import { useWindowDimensions, type HostInstance } from 'react-native';
import { useReducedMotion, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';

import { timing } from '@/core/theme';

// How often a view that hasn't drawn yet checks whether it has scrolled into the window. React
// Native's IntersectionObserver is still behind a native flag, and a per-frame check would keep the
// display link awake while the reader sits still.
const CHECK_MS = 150;

// Ornaments already drawn this session, so scrolling back past one doesn't draw it again.
const drawnKeys = new Set<string>();

// 0 → 1 as an ornament's outline draws in, the first time its view is inside the window.
// With Reduce Motion on, or once its key has drawn, it is 1 from the start.
export function useDrawOnView(
  ref: RefObject<HostInstance | null>,
  key?: string,
  enabled = true,
): SharedValue<number> {
  const reduceMotion = useReducedMotion();
  const { height } = useWindowDimensions();
  const drawn = !enabled || reduceMotion || (key !== undefined && drawnKeys.has(key));
  const progress = useSharedValue(drawn ? 1 : 0);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    if (drawn) {
      progress.value = 1;
      return;
    }
    progress.value = 0;
    let waiting = true;
    const check = () => {
      ref.current?.measureInWindow((_x, y, _width, viewHeight) => {
        if (!waiting || viewHeight === 0 || y >= height || y + viewHeight <= 0) {
          return;
        }
        waiting = false;
        clearInterval(timer);
        if (key !== undefined) {
          drawnKeys.add(key);
        }
        progress.value = withTiming(1, timing('draw'));
      });
    };
    const timer = setInterval(check, CHECK_MS);
    check();
    return () => {
      waiting = false;
      clearInterval(timer);
    };
  }, [drawn, enabled, height, key, progress, ref]);

  return progress;
}

export function resetDrawnOrnamentsForTests() {
  drawnKeys.clear();
}
