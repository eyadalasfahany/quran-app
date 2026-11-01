import type { NativeStackNavigationOptions } from 'expo-router';

type ScreenMotionInput = {
  platform: string;
  reduceMotion: boolean;
};

type PushInput = ScreenMotionInput & {
  isRTL: boolean;
};

/**
 * A normal pushed screen on the root stack. iOS keeps its native slide, which already mirrors in RTL.
 * Android's default is a faint system transition that is not RTL-aware, so it slides in from the
 * reading-start side instead. With Reduce Motion on, both platforms fade.
 */
export function pushScreenOptions({ platform, isRTL, reduceMotion }: PushInput): NativeStackNavigationOptions {
  if (reduceMotion) {
    return { animation: 'fade', gestureEnabled: true };
  }
  if (platform === 'ios') {
    return { animation: 'default', gestureEnabled: true };
  }
  return { animation: isRTL ? 'slide_from_left' : 'slide_from_right', gestureEnabled: true };
}

/**
 * The focused reader: a screen that rises from the bottom edge and is dismissed by a downward swipe on iOS.
 * With Reduce Motion on, it fades.
 */
export function modalLikeScreenOptions({ platform, reduceMotion }: ScreenMotionInput): NativeStackNavigationOptions {
  if (platform === 'ios') {
    return {
      animation: reduceMotion ? 'fade' : 'slide_from_bottom',
      gestureDirection: 'vertical',
      gestureEnabled: true,
    };
  }
  return { animation: reduceMotion ? 'fade' : 'slide_from_bottom', gestureEnabled: true };
}
