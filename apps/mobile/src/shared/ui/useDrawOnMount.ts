import { useEffect, useRef } from 'react';
import { runOnJS, useReducedMotion, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';

import type { DurationToken } from '@quran/design-tokens';

import { timing } from '@/core/theme';

// 0 → 1 as an outline draws in once, starting on mount. With Reduce Motion on, it is 1 immediately.
export function useDrawOnMount(onComplete?: () => void, speed: DurationToken = 'draw'): SharedValue<number> {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(reduceMotion ? 1 : 0);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const finish = () => {
      onCompleteRef.current?.();
    };
    if (reduceMotion) {
      finish();
      return;
    }
    progress.value = 0;
    progress.value = withTiming(1, timing(speed), (finished) => {
      if (finished) {
        runOnJS(finish)();
      }
    });
  }, [progress, reduceMotion, speed]);

  return progress;
}
