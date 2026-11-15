import type { ReactNode } from 'react';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import type { ViewValues } from './map-view-values';

/**
 * Pins a pin, a label or a cluster to a point of the map's content (`x`, `y` in viewbox units) without scaling it: it
 * lives in screen space, over the map, and follows the map's live pan and zoom on the UI thread (`tx + scale × x`). Its
 * children are laid out in points around the anchor (an origin of 0, 0), so they keep their size and stay sharp at any
 * zoom. (A counter-scaled child of the zoomed layer was drawn at the layer's resolution and blurred when zoomed in.)
 */
export function MapAnchor({
  x,
  y,
  values,
  children,
  testID,
}: {
  x: number;
  y: number;
  values: ViewValues;
  children: ReactNode;
  testID?: string;
}) {
  const { scale, tx, ty } = values;
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value + x * scale.value }, { translateY: ty.value + y * scale.value }],
  }));

  return (
    // 1 × 1, not 0 × 0: iOS leaves the subviews of an empty-sized view out of the accessibility tree, so VoiceOver lost every pin.
    <Animated.View pointerEvents="box-none" style={[{ height: 1, left: 0, overflow: 'visible', position: 'absolute', top: 0, width: 1 }, style]} testID={testID}>
      {children}
    </Animated.View>
  );
}
