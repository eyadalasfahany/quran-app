import type { ScrollViewProps } from 'react-native';
import { GestureDetector, useNativeGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedScrollHandler } from 'react-native-reanimated';

import { usePlayerHost } from './player-host-context';
import { recordScroll, recordScrollTouch } from './player-motion';

/**
 * The full player's scroll view. Its native gesture runs alongside the player's pan (as SheetScrollView
 * does), so a downward drag that starts with the content at its top moves the player, and any other
 * drag scrolls the content.
 */
export function PlayerScrollView(props: ScrollViewProps) {
  const { panGesture, scrollOffset, scrollTouched } = usePlayerHost();
  const nativeGesture = useNativeGesture({
    onBegin: () => {
      'worklet';
      recordScrollTouch(scrollTouched, true);
    },
    onFinalize: () => {
      'worklet';
      recordScrollTouch(scrollTouched, false);
    },
    simultaneousWith: panGesture,
  });
  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      'worklet';
      recordScroll(scrollOffset, event.contentOffset.y);
    },
  });

  return (
    <GestureDetector gesture={nativeGesture}>
      <Animated.ScrollView
        {...props}
        // No overscroll: at the top, a downward drag moves the player rather than stretching the content.
        bounces={false}
        overScrollMode="never"
        onScroll={onScroll}
        scrollEventThrottle={16}
      />
    </GestureDetector>
  );
}
