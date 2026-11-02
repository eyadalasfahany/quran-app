import { View } from 'react-native';

import { splashRasterLayers } from './splash-logo-raster-layers';
import { SplashLogoRasterLayer } from './SplashLogoRasterLayer';
import { useDrawOnMount } from './useDrawOnMount';

const DISPLAY = 280;

// Layers sliced from taybah-nabawi-logo.png — exact colours, Arabic counters, English weight.
export function TaybahSplashLogo({ onDrawComplete }: { onDrawComplete?: () => void }) {
  const progress = useDrawOnMount(onDrawComplete, 'splash');

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ height: DISPLAY, width: DISPLAY }}
      testID="taybah-splash-logo"
    >
      {splashRasterLayers.map((layer) => (
        <SplashLogoRasterLayer key={layer.id} globalProgress={progress} layer={layer} size={DISPLAY} />
      ))}
    </View>
  );
}
