import { launchGold } from '@quran/design-tokens';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import Svg from 'react-native-svg';

import { SPLASH_LOGO_VIEWBOX, SPLASH_PEN_FADE, splashRasterLayers } from './splash-logo-raster-layers';
import { segmentProgress, smoothStep } from './splash-logo-segment';
import { splashMosqueStrokes } from './splash-mosque-strokes';
import { SplashLogoRasterLayer } from './SplashLogoRasterLayer';
import { SplashMosqueStroke } from './SplashMosqueStroke';
import { useDrawOnMount } from './useDrawOnMount';

const DISPLAY = 280;

// The line-art mosque draws itself with a gold pen (base, dome, minarets bottom-up, finials), then the exact brush
// mosque fades in over the pen lines and «طيبة» and "taybah" rise into place (ADR 0088).
export function TaybahSplashLogo({ onDrawComplete }: { onDrawComplete?: () => void }) {
  const progress = useDrawOnMount(onDrawComplete, 'splash', 'linear');

  const penStyle = useAnimatedStyle(() => ({
    opacity: 1 - smoothStep(segmentProgress(progress.value, SPLASH_PEN_FADE)),
  }));

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ height: DISPLAY, width: DISPLAY }}
      testID="taybah-splash-logo"
    >
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, penStyle]} testID="splash-mosque-pen">
        <Svg height={DISPLAY} viewBox={`0 0 ${SPLASH_LOGO_VIEWBOX} ${SPLASH_LOGO_VIEWBOX}`} width={DISPLAY}>
          {splashMosqueStrokes.map((stroke) => (
            <SplashMosqueStroke color={launchGold} globalProgress={progress} key={stroke.id} stroke={stroke} />
          ))}
        </Svg>
      </Animated.View>
      {splashRasterLayers.map((layer) => (
        <SplashLogoRasterLayer key={layer.id} globalProgress={progress} layer={layer} size={DISPLAY} />
      ))}
    </View>
  );
}
