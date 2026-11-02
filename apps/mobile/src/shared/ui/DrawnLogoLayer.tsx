import Animated, { useAnimatedProps, useDerivedValue, type SharedValue } from 'react-native-reanimated';
import { G, Path } from 'react-native-svg';

import { DrawnPath } from './DrawnPath';
import { segmentProgress } from './splash-logo-segment';
import type { TaybahLogoLayer } from './taybah-logo-layers';

const AnimatedPath = Animated.createAnimatedComponent(Path);

// One traced logo layer: stroke draw in its time window, then solid fill.
export function DrawnLogoLayer({
  fill,
  globalProgress,
  layer,
  strokeWidth,
  testID,
}: {
  fill: string;
  globalProgress: SharedValue<number>;
  layer: TaybahLogoLayer;
  strokeWidth: number;
  testID?: string;
}) {
  const localProgress = useDerivedValue(() => segmentProgress(globalProgress.value, layer.segment));
  const fillProps = useAnimatedProps(() => ({
    fillOpacity: localProgress.value >= 0.92 ? 1 : localProgress.value * 0.25,
  }));

  const [tx, ty] = layer.translate;

  return (
    <G testID={testID} transform={`translate(${tx} ${ty})`}>
      <AnimatedPath animatedProps={fillProps} d={layer.d} fill={fill} stroke="none" />
      <DrawnPath
        outline={{ d: layer.d, length: layer.length }}
        progress={localProgress}
        stroke={fill}
        strokeWidth={strokeWidth}
        testID={testID ? `${testID}-stroke` : undefined}
      />
    </G>
  );
}
