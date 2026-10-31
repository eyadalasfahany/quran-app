import { Children, type ReactNode } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';

/**
 * The menu's two staggered columns (quran-app-screens.html, #Menu). Children alternate between the columns, the
 * first in the first column. The row lays the columns out in the writing direction, so Arabic starts on the right
 * and English on the left.
 */
export function MenuGrid({ children, testID = 'menu-grid' }: { children: ReactNode; testID?: string }) {
  const theme = useTheme();
  const items = Children.toArray(children);
  const columns = [items.filter((_, index) => index % 2 === 0), items.filter((_, index) => index % 2 === 1)];

  return (
    <View style={{ alignItems: 'flex-start', flexDirection: 'row', gap: theme.space[3] }} testID={testID}>
      {columns.map((column, index) => (
        <View key={index} style={{ flex: 1, gap: theme.space[3], minWidth: 0 }} testID={`${testID}-column-${index}`}>
          {column}
        </View>
      ))}
    </View>
  );
}
