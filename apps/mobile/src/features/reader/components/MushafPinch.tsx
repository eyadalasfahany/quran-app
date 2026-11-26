import { createContext, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { View } from 'react-native';
import {
  GestureDetector,
  GestureHandlerRootView,
  usePinchGesture,
  type PinchGesture,
  type PinchGestureConfig,
} from 'react-native-gesture-handler';

import { pinchMushafZoom } from '../mushaf-svg/mushaf-zoom';
import { useReaderSettings } from '../settings';

/** The Mushaf pinch, for the lists' scroll view to run alongside (`MushafScrollView`). Null outside a `MushafPinch`. */
export const MushafPinchContext = createContext<PinchGesture | null>(null);

/**
 * A pinch on the Mushaf sets the page zoom (ADR 0090 amendment, item 9) in 25% steps: the zoom at the pinch's start times
 * the pinch scale, snapped, and written to the store only when the step changes. It does nothing where zoom is not
 * available (a riwayah without word data stays at 100%). It wraps the Mushaf view, so a pinch keeps running alongside the
 * list's scroll view (MushafScrollView). The stepper in the reader settings is the accessible way to zoom.
 */
export function MushafPinch({ children, zoomAvailable }: { children: ReactNode; zoomAvailable: boolean }) {
  const available = useRef(zoomAvailable);
  useEffect(() => {
    available.current = zoomAvailable;
  }, [zoomAvailable]);
  // The zoom when the pinch began, and the last zoom it committed.
  const start = useRef(1);
  const last = useRef(1);
  const config = useMemo<PinchGestureConfig>(
    () => ({
      onActivate: () => {
        start.current = useReaderSettings.getState().mushafZoom;
        last.current = start.current;
      },
      onUpdate: (event) => {
        if (!available.current) {
          return;
        }
        const next = pinchMushafZoom(start.current, event.scale);
        if (next !== last.current) {
          last.current = next;
          useReaderSettings.getState().setMushafZoom(next);
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
