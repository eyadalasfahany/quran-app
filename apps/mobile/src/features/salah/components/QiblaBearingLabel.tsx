import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { formatNumber } from '@/core/i18n/numbers';
import { useLocale } from '@/core/i18n/useLocale';
import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui/UiText';

/**
 * The readout under the dial: the qibla bearing in degrees from true north
 * (screens/, #Qibla). Arabic-Indic digits in Arabic.
 */
export function QiblaBearingLabel({ bearing, testID }: { bearing: number; testID?: string }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const theme = useTheme();

  return (
    // The frame's 2 px gap; the smallest space token is 4.
    <View style={{ alignItems: 'center', gap: 2 }} testID={testID}>
      <UiText style={{ color: theme.colors.playerInk }} variant="displayLg">
        {formatNumber(Math.round(bearing), locale) + '°'}
      </UiText>
      <UiText style={{ color: theme.colors.playerMuted }} variant="caption">
        {t('home.salah.qiblaScreen.fromTrueNorth')}
      </UiText>
    </View>
  );
}
