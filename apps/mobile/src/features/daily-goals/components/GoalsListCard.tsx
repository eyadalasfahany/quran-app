import { Children, type ReactNode } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { useContrastColors } from '@/shared/ui';

/**
 * The bordered card that holds the goal rows (screens/, #DailyGoalsSheet): a raised 20 pt card with a
 * hairline, the rows divided by a hairline. The card draws the dividers, so a row that does not take a separator
 * (the Settings reminder row) still sits in the list.
 */
export function GoalsListCard({ children, testID = 'goals-list' }: { children: ReactNode; testID?: string }) {
  const theme = useTheme();
  const colors = useContrastColors();
  const rows = Children.toArray(children);

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
      {rows.map((row, index) => (
        <View
          key={index}
          style={
            index < rows.length - 1
              ? { borderBottomColor: colors.line, borderBottomWidth: theme.stroke.hairline }
              : undefined
          }
        >
          {row}
        </View>
      ))}
    </View>
  );
}
