import type { ReactNode } from 'react';
import { Pressable, type StyleProp, type ViewStyle } from 'react-native';

/**
 * A tap target that covers an area of the reader: a tap on any part of it that is not a button calls `onTap`, which
 * counts one repetition (or marks the unit done). It is hidden from VoiceOver and TalkBack (the counter is the
 * accessible control), so its children keep their own accessibility: a button inside it (close, share, the counter, a
 * variation) still takes its own press and does not also reach `onTap`.
 *
 * A press that turns into a scroll is cancelled by Pressable's built-in responder handling, so scrolling a long dhikr
 * never counts. There is no pressed opacity: the counter ring and the haptics are the feedback.
 */
export function AzkarTapSurface({
  children,
  disabled = false,
  onTap,
  style,
  testID = 'azkar-tap-surface',
}: {
  children: ReactNode;
  /** A completed unit, or the completion screen, ignores taps. */
  disabled?: boolean;
  onTap: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  return (
    <Pressable accessible={false} disabled={disabled} importantForAccessibility="no" onPress={onTap} style={style} testID={testID}>
      {children}
    </Pressable>
  );
}
