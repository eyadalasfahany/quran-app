import type { Ref } from 'react';
import {
  ScrollView,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
  type ScrollViewProps,
} from 'react-native';
import { GestureDetector, useNativeGesture } from 'react-native-gesture-handler';

import { useOptionalPlayerHost, type PlayerHostValue } from './player-host-context';
import { recordScroll, recordScrollTouch } from './player-motion';

type AyahScrollViewProps = ScrollViewProps & { ref?: Ref<ScrollViewInstance> };

/**
 * The ayah card's scroll view. It follows PlayerScrollView's hand-off: its native gesture runs alongside the
 * player's pan, so a downward drag that starts with the card at its top moves the player, and any other drag
 * scrolls the card. Unlike PlayerScrollView it takes a ref (the follow scrolls it) and a JS onScroll (the follow
 * tracks its offset). Outside a player it is a plain scroll view.
 */
export function AyahScrollView(props: AyahScrollViewProps) {
  const host = useOptionalPlayerHost();
  if (host === null) {
    return <ScrollView {...props} bounces={false} overScrollMode="never" scrollEventThrottle={16} />;
  }
  return <HandoffScrollView {...props} host={host} />;
}

function HandoffScrollView({ host, onScroll, ...props }: AyahScrollViewProps & { host: PlayerHostValue }) {
  const { panGesture, scrollOffset, scrollTouched } = host;
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

  return (
    <GestureDetector gesture={nativeGesture}>
      <ScrollView
        {...props}
        bounces={false}
        onScroll={(event: NativeSyntheticEvent<NativeScrollEvent>) => {
          recordScroll(scrollOffset, event.nativeEvent.contentOffset.y);
          onScroll?.(event);
        }}
        overScrollMode="never"
        scrollEventThrottle={16}
      />
    </GestureDetector>
  );
}
