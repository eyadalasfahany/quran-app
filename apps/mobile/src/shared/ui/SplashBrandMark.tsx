import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { TaybahSplashLogo } from './TaybahSplashLogo';

// Full Taybah mark on the launch splash: SVG path draw (masjid + wordmark), not a static PNG.
export function SplashBrandMark({ onDrawComplete }: { onDrawComplete?: () => void }) {
  const { t } = useTranslation();

  return (
    <View accessibilityRole="image" accessibilityLabel={t('common.appName')} testID="splash-brand-mark">
      <TaybahSplashLogo onDrawComplete={onDrawComplete} />
    </View>
  );
}
