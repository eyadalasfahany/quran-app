import Animated, { useAnimatedProps, useDerivedValue, type SharedValue } from 'react-native-reanimated';
import { ClipPath, Defs, G, Image, Rect } from 'react-native-svg';

import { segmentProgress } from './splash-logo-segment';
import { SPLASH_LOGO_VIEWBOX, type SplashRasterLayer } from './splash-logo-raster-layers';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

// Pixel-accurate logo slice revealed top-down (cream counters and letter weight stay exact).
export function SplashLogoRasterLayer({
  globalProgress,
  layer,
}: {
  globalProgress: SharedValue<number>;
  layer: SplashRasterLayer;
}) {
  const localProgress = useDerivedValue(() => segmentProgress(globalProgress.value, layer.segment));
  const clipId = `splash-clip-${layer.id}`;

  const clipProps = useAnimatedProps(() => {
    const t = localProgress.value;
    return {
      y: layer.y,
      height: layer.height * t,
    };
  });

  return (
    <G testID={`splash-logo-${layer.id}`}>
      <Defs>
        <ClipPath id={clipId}>
          <AnimatedRect animatedProps={clipProps} height={0} width={layer.width} x={layer.x} />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#${clipId})`}>
        <Image
          height={SPLASH_LOGO_VIEWBOX}
          href={layer.source}
          width={SPLASH_LOGO_VIEWBOX}
          x={0}
          y={0}
        />
      </G>
    </G>
  );
}
