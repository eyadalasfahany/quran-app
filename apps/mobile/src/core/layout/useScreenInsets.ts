import { I18nManager } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// The safe area in reading terms. `start` is the leading edge (the left in LTR, the right in RTL) and `end` the trailing
// one. Pass them to paddingStart / paddingEnd, or to start / end on an absolutely positioned view: React Native maps
// those to the physical side with the same direction, so the values are not flipped twice.
export type ScreenInsets = { top: number; bottom: number; start: number; end: number };

export function screenInsetsFor(
  insets: { top: number; bottom: number; left: number; right: number },
  isRTL: boolean,
): ScreenInsets {
  const { top, bottom, left, right } = insets;
  return isRTL
    ? { bottom, end: left, start: right, top }
    : { bottom, end: right, start: left, top };
}

export function useScreenInsets(): ScreenInsets {
  return screenInsetsFor(useSafeAreaInsets(), I18nManager.isRTL);
}
