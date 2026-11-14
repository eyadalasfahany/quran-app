import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { TaybahSplashLogo } from './TaybahSplashLogo';

// Full Taybah mark on the launch splash: the line-art mosque draws itself, then the lettering fades in (ADR 0088).
export function SplashBrandMark({ onDrawComplete }: { onDrawComplete?: () => void }) {
  const { t } = useTranslation();

  return (
    <View accessibilityRole="image" accessibilityLabel={t('common.appName')} testID="splash-brand-mark">
      <TaybahSplashLogo onDrawComplete={onDrawComplete} />
    </View>
  );
}
