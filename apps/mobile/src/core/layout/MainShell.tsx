import { router, useSegments } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MiniPlayer } from '@/features/audio/components/MiniPlayer';
import { MINI_PLAYER_SIDE } from '@/features/audio/mini-player-metrics';
import { useOfflineStrip } from '@/core/network/useOfflineStrip';
import { useOnline } from '@/core/network/useOnline';
import { useTheme } from '@/core/theme';
import { spring } from '@/core/theme/motion';
import { OfflineBanner, Sidebar } from '@/shared/ui';

import { TabBarScrollSync } from './TabBarScrollSync';
import { sidebarDestinations, type Destination } from './destinations';
import { miniPlayerBottom, miniPlayerHiddenTabsBottom, tabBarSideClearance } from './tab-bar-clearance';
import { TabRailContext } from './TabRailContext';
import { useTabBarHiddenOnScroll } from './useTabBarHiddenOnScroll';
import { useIsShortWindow } from './useWindowClass';

export function MainShell({
  expanded,
  active: activeDestination,
  children,
}: {
  expanded: boolean;
  // A shell whose route names no sidebar group (/salah, ADR 0032 amendment) passes its destination.
  active?: Destination['name'];
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const segments: readonly string[] = useSegments();
  const matched = sidebarDestinations.find((item) => segments.includes(item.name))?.name;
  const current = activeDestination ?? matched;
  // A sheet's route names no tab; the tab under it stays the selected one.
  const [lastActive, setLastActive] = useState(current ?? '(home)');
  if (current !== undefined && current !== lastActive) {
    setLastActive(current);
  }
  const active = current ?? lastActive;
  // A short window draws the tabs as a rail on the start edge (ADR 0036): the screens and the mini player clear it there.
  const short = useIsShortWindow();
  const railSide = tabBarSideClearance(short);
  const tabsScrollHidden = useTabBarHiddenOnScroll();
  const playerBottom = miniPlayerBottom(Platform.OS, insets.bottom, short);
  const playerDrop = playerBottom - miniPlayerHiddenTabsBottom(Platform.OS, insets.bottom, short);
  const playerSlide = useSharedValue(0);
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
      {expanded ? (
        <Sidebar
          items={[
            ...sidebarDestinations.map((item) => ({
              androidIcon: item.androidIcon,
              key: item.name,
              label: t(item.label),
              onPress: () => router.navigate(item.href),
              selected: item.name === active,
              symbol: item.symbol,
              testID: `sidebar-${item.testID}`,
            })),
            {
              androidIcon: 'settings' as const,
              key: 'settings',
              label: t('settings.title'),
              onPress: () => router.push('/settings'),
              selected: false,
              symbol: 'gearshape',
              testID: 'sidebar-settings',
            },
          ]}
          label={t('nav.main')}
          footer={<MiniPlayer variant="sidebar" />}
          search={{ label: t('search.placeholder'), onPress: () => router.push('/search') }}
        />
      ) : null}
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
      {/* Compact and medium only: the frames float the mini player above the tab bar. Expanded windows get
          the sidebar footer instead (above). */}
      {expanded ? null : (
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
      )}
    </View>
    </TabRailContext.Provider>
  );
}
