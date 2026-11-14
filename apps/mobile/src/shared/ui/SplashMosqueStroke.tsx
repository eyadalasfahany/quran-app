import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { DrawnPath } from './DrawnPath';
import type { SplashMosqueStroke as Stroke } from './splash-mosque-strokes';
import { segmentProgress, smoothStep } from './splash-logo-segment';

// One centreline of the line-art mosque, drawn by the gold pen in its window of the splash. Each line eases in and
// out on its own, so the drawing reads as one smooth hand. The pen is as wide as the line's brush stroke on average,
// so the drawing already has the finished logo's weight.
export function SplashMosqueStroke({
  color,
  globalProgress,
  stroke,
}: {
  color: string;
  globalProgress: SharedValue<number>;
  stroke: Stroke;
}) {
  const progress = useDerivedValue(() => smoothStep(segmentProgress(globalProgress.value, stroke.segment)));

  return (
    <DrawnPath
      outline={stroke}
      progress={progress}
      stroke={color}
      strokeWidth={stroke.width}
      testID={`splash-stroke-${stroke.id}`}
    />
  );
}
