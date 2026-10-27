import Animated, { useAnimatedProps, type SharedValue } from 'react-native-reanimated';
import { Path } from 'react-native-svg';

import type { Outline } from './svg-path';

const AnimatedPath = Animated.createAnimatedComponent(Path);

// One stroked outline that draws itself in as `progress` runs from 0 to 1.
export function DrawnPath({
  outline,
  progress,
  stroke,
  strokeWidth,
  testID,
}: {
  outline: Outline;
  progress: SharedValue<number>;
  stroke: string;
  strokeWidth: number;
  testID?: string;
}) {
  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: outline.length * (1 - progress.value),
  }));

  return (
    <AnimatedPath
      animatedProps={animatedProps}
      d={outline.d}
      fill="none"
      stroke={stroke}
      strokeDasharray={[outline.length, outline.length]}
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      testID={testID}
    />
  );
}
