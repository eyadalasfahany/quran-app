import { ScrollView, type ScrollViewProps } from 'react-native';
import { GestureDetector, useNativeGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedScrollHandler } from 'react-native-reanimated';

import { HIDDEN_SCROLL_INDICATORS } from '@/core/layout/hide-scroll-indicators';

import { recordScroll, recordScrollTouch } from './sheet-motion';
import { useSheet, type SheetContextValue } from './sheet-context';

/**
 * A scroll view for sheet content. Inside a SheetHost it scrolls only at the full detent, and its
 * native gesture runs alongside the sheet's pan, so a drag at the top hands over to the sheet.
 * Outside a sheet (the expanded-window side panel) it is a plain ScrollView.
 */
export function SheetScrollView(props: ScrollViewProps) {
  const sheet = useSheet();
  if (sheet === null) {
    return <ScrollView {...props} {...HIDDEN_SCROLL_INDICATORS} />;
  }
  return <SheetHostedScrollView {...props} sheet={sheet} />;
}

function SheetHostedScrollView({ sheet, ...props }: ScrollViewProps & { sheet: SheetContextValue }) {
  const scrollOffset = sheet.scrollOffset;
  const scrollTouched = sheet.scrollTouched;
  const nativeGesture = useNativeGesture({
    onBegin: () => {
      'worklet';
      recordScrollTouch(scrollTouched, true);
    },
    onFinalize: () => {
      'worklet';
      recordScrollTouch(scrollTouched, false);
    },
    simultaneousWith: sheet.panGesture,
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
        // No overscroll: at the top, a downward drag moves the sheet rather than stretching the content.
        {...HIDDEN_SCROLL_INDICATORS}
        bounces={false}
        overScrollMode="never"
        onScroll={onScroll}
        scrollEnabled={sheet.detent === 'full'}
        scrollEventThrottle={16}
      />
    </GestureDetector>
  );
}
