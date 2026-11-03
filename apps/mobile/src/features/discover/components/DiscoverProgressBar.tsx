import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useLocale } from '@/core/i18n';
import { formatNumber } from '@/core/i18n/numbers';
import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui';

/** A thin bar with «٣ من ١٣» beside it. Fills from the start edge, so it runs right to left in Arabic. */
export function DiscoverProgressBar({ done, total, testID }: { done: number; total: number; testID?: string }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const theme = useTheme();
  const summary = t('discover.progress', { done: formatNumber(done, locale), total: formatNumber(total, locale) });
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <View
      accessibilityLabel={`${t('discover.a11y.progressLabel')}: ${summary}`}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: total, now: done }}
      style={{ alignItems: 'center', flexDirection: 'row', gap: theme.space[3] }}
      testID={testID}
    >
      <View
        style={{
          backgroundColor: theme.colors.fillSecondary,
          borderRadius: 3,
          flex: 1,
          height: 6,
          overflow: 'hidden',
        }}
      >
        <View style={{ backgroundColor: theme.colors.brand, borderRadius: 3, height: 6, width: `${percent}%` }} />
      </View>
      <UiText tone="ink" variant="caption" weight={600}>
        {summary}
      </UiText>
    </View>
  );
}
