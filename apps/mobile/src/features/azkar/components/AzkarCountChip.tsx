import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { formatNumber, useLocale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui';

/** The sourced repeat count on a dhikr card («×٣»). Drawn only when a source states the count (ADR 0031 §6). */
export function AzkarCountChip({ count, testID = 'azkar-count-chip' }: { count: number; testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const number = formatNumber(count, locale);

  return (
    <View
      accessibilityLabel={t('azkar.browse.repeatLabel', { number })}
      accessible
      style={{
        backgroundColor: theme.colors.fillSecondary,
        borderRadius: theme.radius.pill,
        justifyContent: 'center',
        minHeight: theme.space[6],
        paddingHorizontal: theme.space[2],
      }}
      testID={testID}
    >
      <UiText tone="muted" variant="caption" weight={600}>
        {t('azkar.browse.repeatChip', { number })}
      </UiText>
    </View>
  );
}
