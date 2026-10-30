import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { UiText, useContrastColors } from '@/shared/ui';

export function SettingsGroup({
  title,
  children,
  testID,
}: {
  title?: string;
  children: ReactNode;
  testID?: string;
}) {
  const theme = useTheme();
  const colors = useContrastColors();

  return (
    <View style={{ gap: theme.space[1] + 2 }} testID={testID}>
      {title ? (
        <UiText
          accessibilityRole="header"
          style={{ marginHorizontal: theme.space[1] + 2 }}
          tone="muted"
          variant="caption"
          weight={600}
        >
          {title}
        </UiText>
      ) : null}
      <View
        style={{
          backgroundColor: theme.colors.surfaceRaised,
          borderColor: colors.line,
          borderRadius: theme.radius.lg,
          borderWidth: theme.stroke.hairline,
          overflow: 'hidden',
        }}
      >
        {children}
      </View>
    </View>
  );
}

