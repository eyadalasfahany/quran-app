import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui';

export function MoonTimeRow({
  label,
  value,
  last = false,
  testID,
}: {
  label: string;
  value: string;
  last?: boolean;
  testID?: string;
}) {
  const theme = useTheme();

  return (
    <View
      style={{
        alignItems: 'center',
        borderBottomColor: last ? 'transparent' : theme.colors.line,
        borderBottomWidth: last ? 0 : 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        minHeight: theme.size.touchTarget,
        paddingVertical: theme.space[2],
      }}
      testID={testID}
    >
      <UiText style={{ color: theme.colors.inkMuted }} variant="subhead">
        {label}
      </UiText>
      <UiText variant="body">{value}</UiText>
    </View>
  );
}
