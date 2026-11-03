import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui';

export function NameHero({ nameAr, position, testID = 'name-hero' }: { nameAr: string; position: number; testID?: string }) {
  const theme = useTheme();

  return (
    <View
      style={{
        alignItems: 'center',
        backgroundColor: theme.colors.brandSurface,
        borderRadius: theme.radius.xl,
        gap: theme.space[2],
        paddingHorizontal: theme.space[5],
        paddingVertical: theme.space[6],
      }}
      testID={testID}
    >
      <UiText tone="muted" variant="caption">
        {position}
      </UiText>
      <UiText style={{ textAlign: 'center' }} variant="displayMd">
        {nameAr}
      </UiText>
    </View>
  );
}
