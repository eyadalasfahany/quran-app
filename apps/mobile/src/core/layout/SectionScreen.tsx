import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Screen, ScreenHeader } from '@/shared/ui';

import { ContentColumn } from './ContentColumn';

// A tab screen: the large header, then its blocks, spaced as the Home frame draws them (18 pt).
export function SectionScreen({
  title,
  testID,
  trailing,
  gutter,
  children,
}: {
  title: string;
  testID: string;
  trailing?: ReactNode;
  gutter?: number;
  children?: ReactNode;
}) {
  const theme = useTheme();

  // The tab bar and the tabs mini bar float above the screen. The screen's own scroll view pads its content by
  // `useTabContentBottom()`, so the content scrolls under the glass and its end clears both.
  return (
    <Screen testID={testID}>
      <ContentColumn gutter={gutter}>
        <View
          style={{ flex: 1, gap: theme.size.sectionGap }}
          testID={`${testID}-content`}
        >
          <ScreenHeader title={title} trailing={trailing} />
          {children}
        </View>
      </ContentColumn>
    </Screen>
  );
}
