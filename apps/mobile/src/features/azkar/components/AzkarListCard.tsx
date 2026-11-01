import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { useContrastColors } from '@/shared/ui';

/** A raised, hairline-bordered card that holds a list of rows (the rows draw their own separators). */
export function AzkarListCard({ children, testID = 'azkar-list-card' }: { children: ReactNode; testID?: string }) {
  const theme = useTheme();
  const colors = useContrastColors();

  return (
    <View
      style={{
        backgroundColor: theme.colors.surfaceRaised,
        borderColor: colors.line,
        borderRadius: theme.radius.lg,
        borderWidth: theme.stroke.hairline,
        overflow: 'hidden',
      }}
      testID={testID}
    >
      {children}
    </View>
  );
}
