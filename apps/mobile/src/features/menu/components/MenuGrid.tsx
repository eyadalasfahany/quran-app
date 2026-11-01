import { Children, type ReactNode } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';

export type MenuGridColumns = 2 | 3;

/**
 * The menu's staggered grid of cards (quran-app-screens.html, #Menu): two columns on a phone, three where the window is
 * wide (ADR 0036). Children are dealt across the columns in turn, the first in the first column. The row lays the columns
 * out in the writing direction, so Arabic starts on the right and English on the left.
 */
export function MenuGrid({
  children,
  columns = 2,
  testID = 'menu-grid',
}: {
  children: ReactNode;
  columns?: MenuGridColumns;
  testID?: string;
}) {
  const theme = useTheme();
  const items = Children.toArray(children);
  const lanes = Array.from({ length: columns }, (_, lane) => items.filter((_, index) => index % columns === lane));

  return (
    <View style={{ alignItems: 'flex-start', flexDirection: 'row', gap: theme.space[3] }} testID={testID}>
      {lanes.map((lane, index) => (
        <View key={index} style={{ flex: 1, gap: theme.space[3], minWidth: 0 }} testID={`${testID}-column-${index}`}>
          {lane}
        </View>
      ))}
    </View>
  );
}
