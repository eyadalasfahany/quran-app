import { useEffect, type ReactNode } from 'react';
import { Platform, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MiniPlayer } from '@/features/audio/components/MiniPlayer';
import { MINI_PLAYER_SIDE } from '@/features/audio/mini-player-metrics';
import { useOnline } from '@/core/network/useOnline';
import { useUpdateStrip } from '@/core/updates/useUpdateStrip';
import { useTheme } from '@/core/theme';
import { spring } from '@/core/theme/motion';
import { OfflineBanner, UpdateBanner } from '@/shared/ui';

import { useContentGutter } from './content-gutter-store';
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
  const gutter = useContentGutter();
  const tabsScrollHidden = useTabBarHiddenOnScroll();
  const playerBottom = miniPlayerBottom(Platform.OS, insets.bottom, rail);
  const playerDrop = playerBottom - miniPlayerHiddenTabsBottom(Platform.OS, insets.bottom, rail);
  const playerSlide = useSharedValue(0);
  // The mini player drops into the tab bar's slot while scrolling hides the bar.
  useEffect(() => {
    playerSlide.value = withSpring(tabsScrollHidden ? 1 : 0, spring());
  }, [tabsScrollHidden, playerSlide]);
  const playerDock = useAnimatedStyle(() => ({ transform: [{ translateY: playerSlide.value * playerDrop }] }));
  // The offline and OTA update notices float in one dock under the status bar. They never push the screens down:
  // a native tab ignores a content margin on iOS (ADR 0085).
  const online = useOnline();
  const updateStrip = useUpdateStrip();

  return (
    <TabRailContext.Provider value={railSide}>
      <View style={{ backgroundColor: theme.colors.surface, flex: 1, flexDirection: 'row' }} testID="main-shell">
        <TabBarScrollSync />
        <View style={{ flex: 1 }}>
          {children}
          {/* box-none: the notices pass touches through to the screen, and their buttons still take them. */}
          <View
            pointerEvents="box-none"
            style={{
              end: gutter,
              gap: theme.space[2],
              position: 'absolute',
              start: railSide + gutter,
              top: insets.top + theme.space[2],
            }}
            testID="offline-strip-dock"
          >
            <OfflineBanner visible={!online} />
            <UpdateBanner onUpdate={updateStrip.update} visible={updateStrip.visible} />
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
