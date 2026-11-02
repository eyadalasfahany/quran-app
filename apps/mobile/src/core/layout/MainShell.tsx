import { useEffect, type ReactNode } from 'react';
import { Platform, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MiniPlayer } from '@/features/audio/components/MiniPlayer';
import { MINI_PLAYER_SIDE } from '@/features/audio/mini-player-metrics';
import { useOfflineStrip } from '@/core/network/useOfflineStrip';
import { useOnline } from '@/core/network/useOnline';
import { useTheme } from '@/core/theme';
import { spring } from '@/core/theme/motion';
import { OfflineBanner } from '@/shared/ui';

import { TabBarScrollSync } from './TabBarScrollSync';
import { miniPlayerBottom, miniPlayerHiddenTabsBottom, tabBarSideClearance } from './tab-bar-clearance';
import { TabRailContext } from './TabRailContext';
import { useTabBarHiddenOnScroll } from './useTabBarHiddenOnScroll';
import { useTabRail } from './useTabRail';

/**
 * The shell around every main tab. A phone keeps the bottom bar, and the screens and the mini player clear it at the bottom.
 * A short window or a tablet draws the tabs as a rail on the start edge (ADR 0036; ADR 0051 as amended 2 Nov 2026), and the
 * screens and the mini player clear that side instead.
 */
export function MainShell({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  // The rail takes the start edge: the screens and the mini player clear it there.
  const rail = useTabRail();
  const railSide = tabBarSideClearance(rail);
  const tabsScrollHidden = useTabBarHiddenOnScroll();
  const playerBottom = miniPlayerBottom(Platform.OS, insets.bottom, rail);
  const playerDrop = playerBottom - miniPlayerHiddenTabsBottom(Platform.OS, insets.bottom, rail);
  const playerSlide = useSharedValue(0);
  // The mini player drops into the tab bar's slot while scrolling hides the bar.
  useEffect(() => {
    playerSlide.value = withSpring(tabsScrollHidden ? 1 : 0, spring());
  }, [tabsScrollHidden, playerSlide]);
  const playerDock = useAnimatedStyle(() => ({ transform: [{ translateY: playerSlide.value * playerDrop }] }));
  // The offline strip sits under the top safe area and pushes the screens down by its height (ADR 0037). The screens
  // keep their own top inset, so the strip is placed on the blank band above them and never covers a title.
  const online = useOnline();
  const offlineStrip = useOfflineStrip(!online);
  const pushDown = useAnimatedStyle(() => ({ marginTop: offlineStrip.layout.value * offlineStrip.natural.value }));

  return (
    <TabRailContext.Provider value={railSide}>
      <View style={{ backgroundColor: theme.colors.surface, flex: 1, flexDirection: 'row' }} testID="main-shell">
        <TabBarScrollSync />
        <View style={{ flex: 1 }}>
          <Animated.View style={[{ flex: 1 }, pushDown]}>{children}</Animated.View>
          <View
            pointerEvents="none"
            style={{ end: 0, position: 'absolute', start: railSide, top: insets.top }}
            testID="offline-strip-dock"
          >
            <OfflineBanner motion={offlineStrip} visible={!online} />
          </View>
        </View>
        {/* The mini player floats above the bottom bar on a phone, and clears the rail on its start side in a rail window. */}
        <Animated.View
          pointerEvents="box-none"
          style={[
            {
              bottom: playerBottom,
              end: MINI_PLAYER_SIDE,
              position: 'absolute',
              start: railSide + MINI_PLAYER_SIDE,
            },
            playerDock,
          ]}
          testID="mini-player-dock"
        >
          <MiniPlayer variant="tabs" />
        </Animated.View>
      </View>
    </TabRailContext.Provider>
  );
}
