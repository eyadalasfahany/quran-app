import { View } from 'react-native';

import { useTheme } from '@/core/theme';

import { MoonTimeRow } from './MoonTimeRow';

/** The times card (#MoonSighting): label and value rows separated by hairlines. The frame has no card title. */
export function MoonTimesCard({
  rows,
  testID = 'moon-times-card',
}: {
  rows: { key: string; label: string; value: string }[];
  testID?: string;
}) {
  const theme = useTheme();

  return (
    <View
      style={{
        backgroundColor: theme.colors.surfaceRaised,
        borderColor: theme.colors.line,
        borderRadius: theme.radius.hero,
        borderWidth: 1,
        paddingHorizontal: theme.space[4],
      }}
      testID={testID}
    >
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
