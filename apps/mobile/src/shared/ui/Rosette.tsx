import { useRef } from 'react';
import { View, type HostInstance, type StyleProp, type ViewStyle } from 'react-native';
import Svg from 'react-native-svg';

import { DrawnPath } from './DrawnPath';
import { circle, polygon, square } from './svg-path';
import { useDrawOnView } from './useDrawOnView';

// The design's 100 × 100 rosette: an eight-pointed star over two crossed squares and a ring.
const VIEW_BOX = 100;
const STROKE = 0.8;
const OUTLINES = [
  polygon([
    [50, 4],
    [63, 37],
    [96, 50],
    [63, 63],
    [50, 96],
    [37, 63],
    [4, 50],
    [37, 37],
  ]),
  square(50, 50, 28 * Math.SQRT2, 45),
  square(50, 50, 28 * Math.SQRT2),
  circle(50, 50, 12),
];

// A decorative gold rosette. Its outline draws in the first time it scrolls into view.
export function Rosette({
  size,
  color,
  drawKey,
  style,
  testID,
}: {
  size: number;
  color: string;
  /** Draws once per session for this key. */
  drawKey?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const ref = useRef<HostInstance>(null);
  const progress = useDrawOnView(ref, drawKey);

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      ref={ref}
      style={[{ height: size, width: size }, style]}
      testID={testID}
    >
      <Svg height={size} viewBox={`0 0 ${VIEW_BOX} ${VIEW_BOX}`} width={size}>
        {OUTLINES.map((outline, index) => (
          <DrawnPath
            key={index}
            outline={outline}
            progress={progress}
            stroke={color}
            strokeWidth={STROKE}
            testID={testID ? `${testID}-stroke-${index}` : undefined}
          />
        ))}
      </Svg>
    </View>
  );
}
