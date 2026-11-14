import { Image, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { SPLASH_LOGO_VIEWBOX, type SplashRasterLayer } from './splash-logo-raster-layers';
import { segmentProgress, smoothStep } from './splash-logo-segment';

// One pixel-exact part of the logo (the brush mosque, «طيبة» or "taybah") fading in and rising gently into place
// in its window of the splash. Opacity and transform run on a plain view, which redraws on both platforms.
export function SplashLogoRasterLayer({
  globalProgress,
  layer,
  size,
}: {
  globalProgress: SharedValue<number>;
  layer: SplashRasterLayer;
  /** Rendered width and height of the whole logo, in points. */
  size: number;
}) {
  const scale = size / SPLASH_LOGO_VIEWBOX;
  const localProgress = useDerivedValue(() => smoothStep(segmentProgress(globalProgress.value, layer.segment)));

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: localProgress.value,
    transform: [{ translateY: layer.rise * scale * (1 - localProgress.value) }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.layer, { height: size, width: size }, fadeStyle]}
      testID={`splash-logo-${layer.id}`}
    >
      <Image source={layer.source} style={{ height: size, width: size }} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: {
    left: 0,
    position: 'absolute',
    top: 0,
  },
});
