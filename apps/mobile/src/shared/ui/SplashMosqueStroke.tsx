import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { DrawnPath } from './DrawnPath';
import type { SplashMosqueStroke as Stroke } from './splash-mosque-strokes';
import { segmentProgress, smoothStep } from './splash-logo-segment';

// One centreline of the line-art mosque, drawn by the gold pen in its window of the splash. Each line eases in and
// out on its own, so the drawing reads as one smooth hand.
export function SplashMosqueStroke({
  color,
  globalProgress,
  stroke,
  strokeWidth,
}: {
  color: string;
  globalProgress: SharedValue<number>;
  stroke: Stroke;
  strokeWidth: number;
}) {
  const progress = useDerivedValue(() => smoothStep(segmentProgress(globalProgress.value, stroke.segment)));

  return (
    <DrawnPath
      outline={stroke}
      progress={progress}
      stroke={color}
      strokeWidth={strokeWidth}
      testID={`splash-stroke-${stroke.id}`}
    />
  );
}
