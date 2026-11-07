import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';

// Frame HadithCollExpanded: the start pane is 340 wide, the details panel 300.
const START_WIDTH = 340;
const SIDE_WIDTH = 300;

/**
 * The start pane (the books), the end pane (the list or the reader) and an optional details pane. A single-book
 * collection has no start pane. Each pane scrolls on its own.
 */
export function HadithPaneLayout({
  start,
  end,
  side,
  testID = 'hadith-pane-layout',
}: {
  start?: ReactNode;
  end: ReactNode;
  side?: ReactNode;
  testID?: string;
}) {
  const theme = useTheme();

  return (
    <View style={{ flex: 1, flexDirection: 'row', gap: theme.space[4] }} testID={testID}>
      {start !== undefined ? (
        <View style={{ width: START_WIDTH }} testID={`${testID}-start`}>
          {start}
        </View>
      ) : null}
      <View style={{ flex: 1, minWidth: 0 }} testID={`${testID}-end`}>
        {end}
      </View>
      {side !== undefined ? (
        <View style={{ width: SIDE_WIDTH }} testID={`${testID}-side`}>
          {side}
        </View>
      ) : null}
    </View>
  );
}
