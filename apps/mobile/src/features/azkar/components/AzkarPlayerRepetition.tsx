import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { formatNumber } from '@/core/i18n/numbers';
import { useLocale } from '@/core/i18n/useLocale';
import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui';

/**
 * The current repetition of the dhikr that plays, «٢ من ٣» (ADR 0031 §6, §8). It is announced as it changes, so a
 * screen reader hears each repetition. It draws nothing for a dhikr with no sourced count.
 */
export function AzkarPlayerRepetition({
  current,
  total,
  testID = 'azkar-player-repetition',
}: {
  current: number;
  total: number;
  testID?: string;
}) {
  const { t } = useTranslation();
  const locale = useLocale();
  const theme = useTheme();
  const shown = t('azkar.player.repetitionShort', {
    current: formatNumber(current, locale),
    total: formatNumber(total, locale),
  });

  return (
    <View
      accessibilityLabel={t('azkar.player.repetition', { current: formatNumber(current, locale), total: formatNumber(total, locale) })}
      accessibilityLiveRegion="polite"
      accessibilityRole="text"
      style={{
        alignSelf: 'center',
        backgroundColor: theme.colors.fillSecondary,
        borderRadius: theme.radius.pill,
        paddingHorizontal: theme.space[3],
        paddingVertical: theme.space[1],
      }}
      testID={testID}
    >
      <UiText tone="muted" variant="caption" weight={600}>
        {shown}
      </UiText>
    </View>
  );
}
