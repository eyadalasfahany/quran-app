import { View } from 'react-native';
import Svg from 'react-native-svg';

import { SPLASH_LOGO_VIEWBOX, splashRasterLayers } from './splash-logo-raster-layers';
import { SplashLogoRasterLayer } from './SplashLogoRasterLayer';
import { useDrawOnMount } from './useDrawOnMount';

const DISPLAY = 280;

// Layers sliced from taybah-nabawi-logo.png — exact colours, Arabic counters, English weight.
export function TaybahSplashLogo({ onDrawComplete }: { onDrawComplete?: () => void }) {
  const progress = useDrawOnMount(onDrawComplete, 'splash');

  return (
    <View style={{ height: DISPLAY, width: DISPLAY }} testID="taybah-splash-logo">
      <Svg
        accessibilityElementsHidden
        height={DISPLAY}
        importantForAccessibility="no-hide-descendants"
        viewBox={`0 0 ${SPLASH_LOGO_VIEWBOX} ${SPLASH_LOGO_VIEWBOX}`}
        width={DISPLAY}
      >
        {splashRasterLayers.map((layer) => (
          <SplashLogoRasterLayer key={layer.id} globalProgress={progress} layer={layer} />
        ))}
      </Svg>
    </View>
  );
}
