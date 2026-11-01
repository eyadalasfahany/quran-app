import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { useContrastColors } from '@/shared/ui';

/**
 * The bordered card that holds the goal rows (quran-app-screens.html, #DailyGoalsSheet): a raised 20 pt card with a
 * hairline, the rows divided inside it.
 */
export function GoalsListCard({ children, testID = 'goals-list' }: { children: ReactNode; testID?: string }) {
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
