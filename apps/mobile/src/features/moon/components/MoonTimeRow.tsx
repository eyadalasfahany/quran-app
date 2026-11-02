import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui';

/**
 * One row of the times card: a muted label at the start and the value at the end. The value runs left to right, as
 * the frame sets it (bdi dir="ltr"), so «٩ نوفمبر · ١٠:٠٢ ص» keeps its order in Arabic.
 */
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
        gap: theme.space[2],
        justifyContent: 'space-between',
        minHeight: theme.size.touchTarget,
      }}
      testID={testID}
    >
      <UiText style={{ color: theme.colors.inkMuted }} variant="subhead">
        {label}
      </UiText>
      <UiText style={{ writingDirection: 'ltr' }} testID={testID ? `${testID}-value` : undefined} variant="headline">
        {value}
      </UiText>
    </View>
  );
}
