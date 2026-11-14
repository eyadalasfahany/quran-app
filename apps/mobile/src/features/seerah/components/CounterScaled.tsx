import type { ReactNode } from 'react';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

/**
 * Anchors its children at a point of the map's content (`x`, `y` in viewbox units) and undoes the map's zoom, so a pin
 * or a label keeps its size in points while the art scales under it. The children are laid out in screen points around
 * the anchor (an origin of 0, 0). `scale` is the map's live zoom, so the counter-scale follows a pinch frame by frame.
 */
export function CounterScaled({
  x,
  y,
  scale,
  children,
  testID,
}: {
  x: number;
  y: number;
  scale: SharedValue<number>;
  children: ReactNode;
  testID?: string;
}) {
  const style = useAnimatedStyle(() => ({ transform: [{ scale: 1 / scale.value }] }));

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[{ height: 0, left: x, overflow: 'visible', position: 'absolute', top: y, transformOrigin: 'top left', width: 0 }, style]}
      testID={testID}
    >
      {children}
    </Animated.View>
  );
}
