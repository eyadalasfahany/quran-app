import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useMiniPlayerVisible } from '@/features/audio/hooks/useMiniPlayerVisible';
import { MINI_PLAYER_TABS_FOOTPRINT } from '@/features/audio/mini-player-metrics';
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
  // The tabs mini bar floats above the tab bar; the blocks keep clear of it while it shows.
  const miniShown = useMiniPlayerVisible('tabs');

  return (
    <Screen testID={testID}>
      <ContentColumn gutter={gutter}>
        <View
          style={{ flex: 1, gap: theme.size.sectionGap, paddingBottom: miniShown ? MINI_PLAYER_TABS_FOOTPRINT : 0 }}
          testID={`${testID}-content`}
        >
          <ScreenHeader title={title} trailing={trailing} />
          {children}
        </View>
      </ContentColumn>
    </Screen>
  );
}
