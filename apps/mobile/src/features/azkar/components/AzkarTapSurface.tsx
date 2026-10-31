import type { ReactNode } from 'react';
import { Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { useTheme } from '@/core/theme';

/**
 * The opacity of the dhikr area while a press is held: the pressed opacity, or none with Reduce Motion.
 * Exported so the rule is tested without reaching into Pressable's internal state.
 */
export function tapSurfaceOpacity(pressed: boolean, reduceMotion: boolean, pressedOpacity: number): number {
  return pressed && !reduceMotion ? pressedOpacity : 1;
}

/**
 * The dhikr area of the reader as one tap target: a tap anywhere on it calls `onTap`, which counts one repetition
 * (or marks the unit done). It is hidden from VoiceOver and TalkBack (the counter is the accessible control), so its
 * children keep their own accessibility: a button inside it (details, a variation) still takes its own press.
 *
 * A press that turns into a scroll is cancelled by Pressable's built-in responder handling, so scrolling a long dhikr
 * never counts. Pressed feedback is the design's pressed opacity, and none with Reduce Motion.
 */
export function AzkarTapSurface({
  children,
  disabled = false,
  onTap,
  style,
  testID = 'azkar-tap-surface',
}: {
  children: ReactNode;
  /** A completed unit ignores taps. */
  disabled?: boolean;
  onTap: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();

  return (
    <Pressable
      accessible={false}
      disabled={disabled}
      importantForAccessibility="no"
      onPress={onTap}
      style={({ pressed }) => [style, { opacity: tapSurfaceOpacity(pressed, reduceMotion, theme.opacity.pressed) }]}
      testID={testID}
    >
      {children}
    </Pressable>
  );
}
