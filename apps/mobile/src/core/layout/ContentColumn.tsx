import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';

// Reading and Focus cap the text column at about 720 (spec §4).
export const CONTENT_COLUMN_MAX_WIDTH = 720;

export function ContentColumn({ children }: { children: ReactNode }) {
  const theme = useTheme();

  return (
    <View
      style={{
        alignSelf: 'center',
        flex: 1,
        maxWidth: CONTENT_COLUMN_MAX_WIDTH,
        paddingHorizontal: theme.space[6],
        width: '100%',
      }}
    >
      {children}
    </View>
  );
}
