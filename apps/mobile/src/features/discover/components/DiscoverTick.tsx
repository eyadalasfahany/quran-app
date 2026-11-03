import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Icon, useContrastColors, type IconName } from '@/shared/ui';

const CHECK: IconName = { ios: 'checkmark', android: 'check' };
const SIZE = 28;

/** The tick at the start of a row: a filled brand disc with a check when done, an empty ring when not. Decorative. */
export function DiscoverTick({ done, testID }: { done: boolean; testID?: string }) {
  const theme = useTheme();
  const colors = useContrastColors();

  if (done) {
    return (
      <View
        style={{
          alignItems: 'center',
          backgroundColor: theme.colors.brand,
          borderRadius: SIZE / 2,
          height: SIZE,
          justifyContent: 'center',
          width: SIZE,
        }}
        testID={testID}
      >
        <Icon color={colors.onBrand} name={CHECK} size={16} />
      </View>
    );
  }

  return (
    <View
      style={{
        borderColor: colors.inkMuted,
        borderRadius: SIZE / 2,
        borderWidth: theme.stroke.hairline,
        height: SIZE,
        width: SIZE,
      }}
      testID={testID}
    />
  );
}
