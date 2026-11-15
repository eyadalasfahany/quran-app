import { forwardRef, useContext, useMemo } from 'react';
import { ScrollView, type ScrollViewInstance, type ScrollViewProps } from 'react-native';
import { GestureDetector, useNativeGesture } from 'react-native-gesture-handler';

import { MushafPinchContext } from './MushafPinch';

/**
 * The Mushaf lists' scroll view (FlashList's `renderScrollComponent`). Inside a `MushafPinch`, its native scroll gesture
 * runs alongside the pinch, as FocusStage's scroll runs alongside its swipe: one finger scrolls, two pinch, and taps and
 * long presses still reach the ayahs. Outside one it is the plain scroll view.
 *
 * The native gesture attaches to the detector's only child, so it wraps the scroll view itself: FlashList's own root is
 * a container view. A module-level component, because FlashList remounts its scroller whenever this prop changes.
 */
export const MushafScrollView = forwardRef<ScrollViewInstance, ScrollViewProps>(function MushafScrollView(props, ref) {
  const pinch = useContext(MushafPinchContext);
  const scroll = useNativeGesture(useMemo(() => ({ simultaneousWith: pinch ?? undefined }), [pinch]));
  const view = <ScrollView {...props} ref={ref} />;
  return pinch === null ? view : <GestureDetector gesture={scroll}>{view}</GestureDetector>;
});
