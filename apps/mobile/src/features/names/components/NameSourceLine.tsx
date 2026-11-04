import { Pressable, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Icon, UiText, useContrastColors } from '@/shared/ui';

const INFO = { ios: 'info.circle', android: 'info' } as const;

export function NameSourceLine({
  label,
  onInfoPress,
  testID = 'names-source-line',
}: {
  label: string;
  onInfoPress?: () => void;
  testID?: string;
}) {
  const theme = useTheme();
  const colors = useContrastColors();

  return (
    <View style={{ alignItems: 'center', flexDirection: 'row', gap: theme.space[2] }} testID={testID}>
      <UiText style={{ flex: 1 }} tone="muted" variant="caption">
        {label}
      </UiText>
      {onInfoPress ? (
        <Pressable accessibilityRole="button" onPress={onInfoPress} testID={`${testID}-info`}>
          <Icon color={colors.inkMuted} name={INFO} size={18} />
        </Pressable>
      ) : null}
    </View>
  );
}
