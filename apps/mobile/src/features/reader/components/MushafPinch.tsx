import { createContext, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { View } from 'react-native';
import {
  GestureDetector,
  GestureHandlerRootView,
  usePinchGesture,
  type PinchGesture,
  type PinchGestureConfig,
} from 'react-native-gesture-handler';

import { pinchFontScale } from '../mushaf-svg/mushaf-view';
import { useReaderSettings } from '../settings';

/** The Mushaf pinch, for the lists' scroll view to run alongside (`MushafScrollView`). Null outside a `MushafPinch`. */
export const MushafPinchContext = createContext<PinchGesture | null>(null);

/**
 * A pinch on the Mushaf changes the reader's text size, the same setting as the font sizer, in its 0.1 steps (developer,
 * 15 Nov 2026). It wraps both Mushaf views, above the switch between them, so a pinch that crosses 1× keeps running
 * while the view under the fingers changes. The size snaps, so nothing animates; the sizer stays the accessible way to
 * resize.
 */
export function MushafPinch({ children, maxScale }: { children: ReactNode; maxScale: number }) {
  const cap = useRef(maxScale);
  useEffect(() => {
    cap.current = maxScale;
  }, [maxScale]);
  // The size when the pinch began, and the last size it committed: a step commits only when the snapped size changes.
  const start = useRef(1);
  const last = useRef(1);
  const config = useMemo<PinchGestureConfig>(
    () => ({
      onActivate: () => {
        start.current = useReaderSettings.getState().fontScale;
        last.current = start.current;
      },
      onUpdate: (event) => {
        const next = pinchFontScale(start.current, event.scale, cap.current);
        if (next !== last.current) {
          last.current = next;
          useReaderSettings.getState().setFontScale(next);
        }
      },
      runOnJS: true,
    }),
    [],
  );
  const pinch = usePinchGesture(config);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GestureDetector gesture={pinch}>
        <View style={{ flex: 1 }}>
          <MushafPinchContext value={pinch}>{children}</MushafPinchContext>
        </View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}
