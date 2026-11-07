import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import type { CoverOrnamentShape } from './collection-cover';

// The ornament is drawn at 80% so it sits under the title colour, as in the approved frames.
const ORNAMENT_OPACITY = 0.8;
const STROKE_WIDTH = 2.2;
const VIEW_BOX = '0 0 100 100';

// The three binding ornaments, copied from the frames' SVG (100 × 100 view box).
function ornamentShapes(shape: CoverOrnamentShape) {
  if (shape === 'rings') {
    return (
      <>
        <Circle cx={50} cy={50} r={30} />
        <Circle cx={50} cy={50} r={14} />
      </>
    );
  }
  if (shape === 'diamond') {
    return (
      <>
        <Path d="M50 14 L86 50 L50 86 L14 50 Z" />
        <Circle cx={50} cy={50} r={7} />
      </>
    );
  }
  return (
    <>
      <Path d="M50 4l13 33 33 13-33 13-13 33-13-33L4 50l33-13z" />
      <Circle cx={50} cy={50} r={10} />
    </>
  );
}

// A decorative gold ornament on a cover. Hidden from screen readers; the cover is the one accessible element.
export function CoverOrnament({
  shape,
  size,
  color,
  testID,
}: {
  shape: CoverOrnamentShape;
  size: number;
  color: string;
  testID?: string;
}) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={{ height: size, opacity: ORNAMENT_OPACITY, width: size }}
      testID={testID}
    >
      <Svg fill="none" height={size} stroke={color} strokeWidth={STROKE_WIDTH} viewBox={VIEW_BOX} width={size}>
        {ornamentShapes(shape)}
      </Svg>
    </View>
  );
}
