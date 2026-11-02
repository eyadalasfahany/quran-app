import { Image, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { segmentProgress } from './splash-logo-segment';
import { SPLASH_LOGO_VIEWBOX, type SplashRasterLayer } from './splash-logo-raster-layers';

// Pixel-accurate logo slice revealed top-down (cream counters and letter weight stay exact).
// A plain View with overflow hidden grows over the slice. An animated SVG <ClipPath> is not used: react-native-svg
// on Android does not redraw when a clip path's child changes, so the mark stayed invisible there.
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
  const localProgress = useDerivedValue(() => segmentProgress(globalProgress.value, layer.segment));

  const revealStyle = useAnimatedStyle(() => ({
    height: layer.height * scale * localProgress.value,
  }));

  return (
    <Animated.View
      style={[
        styles.band,
        { left: layer.x * scale, top: layer.y * scale, width: layer.width * scale },
        revealStyle,
      ]}
      testID={`splash-logo-${layer.id}`}
    >
      <Image
        source={layer.source}
        style={{ height: size, left: -layer.x * scale, position: 'absolute', top: -layer.y * scale, width: size }}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  band: {
    overflow: 'hidden',
    position: 'absolute',
  },
});
