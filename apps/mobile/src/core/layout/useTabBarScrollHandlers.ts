import { useMemo } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

import { useTabBarScrollStore } from './tab-bar-scroll-store';

/** Spread onto a tab screen's `ScrollView`, `FlatList`, or `FlashList`. */
export function useTabBarScrollHandlers(
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void,
): {
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  scrollEventThrottle: number;
} {
  const reportOffset = useTabBarScrollStore((state) => state.reportOffset);

  return useMemo(
    () => ({
      scrollEventThrottle: 16 as const,
      onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        reportOffset(event.nativeEvent.contentOffset.y);
        onScroll?.(event);
      },
    }),
    [onScroll, reportOffset],
  );
}
