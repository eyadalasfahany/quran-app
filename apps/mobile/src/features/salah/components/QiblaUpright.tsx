import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { uprightRotationFor } from '../hooks/useDialTurn';

/**
 * A layer on the qibla dial that stays upright on screen while the dial turns under it. It counter-rotates by the dial's
 * turn about its own centre, so a cardinal letter, a numeral or the Kaaba glyph keeps its reading direction. The caller
 * positions it (absolute, with its box); the rotation is an animated transform read on the UI thread.
 */
export function QiblaUpright({
  turn,
  style,
  children,
  testID,
}: {
  /** The dial's turn (see useDialTurn); the layer rotates by the same amount the other way. */
  turn: SharedValue<number>;
  style: StyleProp<ViewStyle>;
  children: ReactNode;
  testID?: string;
}) {
  const uprightStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${uprightRotationFor(turn.value)}deg` }],
  }));

  return (
    <Animated.View pointerEvents="none" style={[style, uprightStyle]} testID={testID}>
      {children}
    </Animated.View>
  );
}
