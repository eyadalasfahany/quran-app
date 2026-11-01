import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';

// Reading and Focus cap the text column at about 720 (spec §4).
export const CONTENT_COLUMN_MAX_WIDTH = 720;

// The side gutter defaults to space[6] (24). Home and the surah index pass their frame's gutter.
export function ContentColumn({ children, gutter, testID }: { children: ReactNode; gutter?: number; testID?: string }) {
  const theme = useTheme();

  return (
    <View
      style={{
        alignSelf: 'center',
        flex: 1,
        maxWidth: CONTENT_COLUMN_MAX_WIDTH,
        paddingHorizontal: gutter ?? theme.space[6],
        width: '100%',
      }}
      testID={testID}
    >
      {children}
    </View>
  );
}
