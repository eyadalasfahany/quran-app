import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { formatNumber, useLocale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui';

import { DailyWirdOrnament } from './DailyWirdOrnament';

export function DailyWirdCard({
  pagesPerDay,
  juzApprox,
  testID = 'khatma-daily-wird',
}: {
  pagesPerDay: number;
  juzApprox: number;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();

  return (
    <View
      accessibilityLabel={t('khatma.dailyWirdA11y', {
        juz: formatNumber(juzApprox, locale),
        pages: formatNumber(pagesPerDay, locale),
      })}
      style={{
        alignItems: 'center',
        backgroundColor: theme.colors.brandSurface,
        borderRadius: theme.radius.hero,
        flexDirection: 'row',
        gap: theme.space[4],
        padding: theme.size.cardPadding,
      }}
      testID={testID}
    >
      <View style={{ flex: 1, gap: theme.space[1] }}>
        <UiText tone="onBrandMuted" variant="caption" weight={500}>
          {t('khatma.dailyWirdLabel')}
        </UiText>
        <UiText tone="onBrand" variant="displayLg">
          {t('khatma.pagesPerDay', { count: pagesPerDay, formatted: formatNumber(pagesPerDay, locale) })}
        </UiText>
        <UiText tone="onBrandMuted" variant="caption">
          {t('khatma.juzApprox', { count: juzApprox, formatted: formatNumber(juzApprox, locale) })}
        </UiText>
      </View>
      <DailyWirdOrnament testID={`${testID}-ornament`} />
    </View>
  );
}
