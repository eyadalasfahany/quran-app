import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui';

import { MoonTimeRow } from './MoonTimeRow';

export function MoonTimesCard({
  rows,
  testID = 'moon-times-card',
}: {
  rows: { key: string; label: string; value: string }[];
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View
      style={{
        backgroundColor: theme.colors.surfaceRaised,
        borderColor: theme.colors.line,
        borderRadius: theme.radius.hero,
        borderWidth: 1,
        gap: theme.space[1],
        paddingHorizontal: theme.space[5],
        paddingVertical: theme.space[4],
      }}
      testID={testID}
    >
      <UiText style={{ color: theme.colors.inkMuted }} variant="headline">
        {t('moon.times.title')}
      </UiText>
      {rows.map((row, index) => (
        <MoonTimeRow
          key={row.key}
          label={row.label}
          last={index === rows.length - 1}
          testID={`${testID}-${row.key}`}
          value={row.value}
        />
      ))}
    </View>
  );
}
