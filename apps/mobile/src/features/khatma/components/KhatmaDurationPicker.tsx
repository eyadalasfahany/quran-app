import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { formatNumber, useLocale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { SegmentedControl, UiText } from '@/shared/ui';

import { KHATMA_DURATION_OPTIONS, type KhatmaDurationDays } from '../constants';

type DurationKey = `${KhatmaDurationDays}`;

function durationKey(days: KhatmaDurationDays): DurationKey {
  return String(days) as DurationKey;
}

export function KhatmaDurationPicker({
  value,
  onChange,
  testID = 'khatma-duration-picker',
}: {
  value: KhatmaDurationDays;
  onChange: (days: KhatmaDurationDays) => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();

  return (
    <View accessibilityLabel={t('khatma.durationLabel')} style={{ gap: theme.space[2] }} testID={testID}>
      <UiText nativeID={`${testID}-label`} tone="muted" variant="caption">
        {t('khatma.durationLabel')}
      </UiText>
      <SegmentedControl<DurationKey>
        label={t('khatma.durationLabel')}
        onChange={(key) => onChange(Number(key) as KhatmaDurationDays)}
        options={KHATMA_DURATION_OPTIONS.map((days) => ({
          key: durationKey(days),
          label: t('khatma.durationDays', { count: days, formatted: formatNumber(days, locale) }),
        }))}
        testID={`${testID}-control`}
        value={durationKey(value)}
      />
    </View>
  );
}
