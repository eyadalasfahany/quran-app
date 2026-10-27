import type { RadiusToken, SpaceToken } from '@quran/design-tokens';
import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { useTheme } from '@/core/theme';

import { useContrastColors } from './useContrastColors';

// 'raised' cards sit on the screen; 'page' cards hold Quran text inside a raised sheet.
export type CardTone = 'raised' | 'page';

export function Card({
  children,
  tone = 'raised',
  radius = 'lg',
  padding = 4,
  bordered = true,
  style,
  testID,
  ...accessibility
}: {
  children?: ReactNode;
  tone?: CardTone;
  radius?: RadiusToken;
  padding?: SpaceToken;
  bordered?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
} & Pick<ViewProps, 'accessibilityLabel' | 'accessibilityRole' | 'accessible'>) {
  const theme = useTheme();
  const colors = useContrastColors();

  return (
    <View
      {...accessibility}
      style={[
        {
          backgroundColor: tone === 'page' ? theme.colors.surfacePage : theme.colors.surfaceRaised,
          borderRadius: theme.radius[radius],
          padding: theme.space[padding],
        },
        bordered ? { borderColor: colors.line, borderWidth: theme.stroke.hairline } : null,
        style,
      ]}
      testID={testID}
    >
      {children}
    </View>
  );
}
