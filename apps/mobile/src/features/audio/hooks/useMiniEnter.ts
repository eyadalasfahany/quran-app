import { useEffect } from 'react';
import { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { spring, timing } from '@/core/theme';

import { MINI_PLAYER_ENTER_OFFSET } from '../mini-player-metrics';

// Switch-in for a bar or a capsule that mounts. Glass never fades: the container slides up into place (a spring),
// and under Reduce Motion it doesn't move; only the content fades in. Returns the two styles to apply.
export function useMiniEnter(): { container: ReturnType<typeof useAnimatedStyle>; content: ReturnType<typeof useAnimatedStyle> } {
  const reduceMotion = useReducedMotion();
  const offset = useSharedValue(reduceMotion ? 0 : MINI_PLAYER_ENTER_OFFSET);
  const contentOpacity = useSharedValue(reduceMotion ? 0 : 1);

  useEffect(() => {
    if (reduceMotion) {
      contentOpacity.value = withTiming(1, timing('standard'));
      return;
    }
    offset.value = withSpring(0, spring());
  }, [contentOpacity, offset, reduceMotion]);

  const container = useAnimatedStyle(() => ({ transform: [{ translateY: offset.value }] }));
  const content = useAnimatedStyle(() => ({ opacity: contentOpacity.value }));
  return { container, content };
}
