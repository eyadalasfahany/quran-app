import { useCallback, useMemo, useRef } from 'react';
import { useWindowDimensions } from 'react-native';
import { useAnimatedStyle, useReducedMotion, useSharedValue } from 'react-native-reanimated';

import { spring } from '@/core/theme';

import { fadeValue, springValue } from '../components/player-motion';

/**
 * The exit of a sheet drawn in the player: the sheet slides down (the reverse of its entrance) and the scrim
 * fades; under Reduce Motion the sheet fades instead. `onClose` runs only when the exit has finished, so the
 * owner keeps the sheet mounted for the whole slide.
 */
export function usePlayerSheetExit(onClose: () => void) {
  const reduceMotion = useReducedMotion();
  const { height } = useWindowDimensions();
  const config = useMemo(() => spring(), []);
  // 0 while the sheet is open, 1 once it has left.
  const progress = useSharedValue(0);
  const closing = useRef(false);

  const dismiss = useCallback(() => {
    if (closing.current) {
      return;
    }
    closing.current = true;
    if (reduceMotion) {
      fadeValue(progress, 1, onClose);
      return;
    }
    springValue(progress, 1, config, onClose);
  }, [config, onClose, progress, reduceMotion]);

  const sheetStyle = useAnimatedStyle(() =>
    reduceMotion ? { opacity: 1 - progress.value } : { transform: [{ translateY: progress.value * height }] },
  );
  const scrimStyle = useAnimatedStyle(() => ({ opacity: 1 - progress.value }));

  return { dismiss, sheetStyle, scrimStyle };
}
