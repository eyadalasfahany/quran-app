import { router, useSegments } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MiniPlayer } from '@/features/audio/components/MiniPlayer';
import { MINI_PLAYER_SIDE } from '@/features/audio/mini-player-metrics';
import { useTheme } from '@/core/theme';
import { Sidebar } from '@/shared/ui';

import { sidebarDestinations } from './destinations';
import { miniPlayerBottom } from './tab-bar-clearance';

export function MainShell({ expanded, children }: { expanded: boolean; children: ReactNode }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const segments: readonly string[] = useSegments();
  const current = sidebarDestinations.find((item) => segments.includes(item.name))?.name;
  // A sheet's route names no tab; the tab under it stays the selected one.
  const [lastActive, setLastActive] = useState(current ?? '(home)');
  if (current !== undefined && current !== lastActive) {
    setLastActive(current);
  }
  const active = current ?? lastActive;

  return (
    <View style={{ backgroundColor: theme.colors.surface, flex: 1, flexDirection: 'row' }} testID="main-shell">
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
      <View style={{ flex: 1 }}>{children}</View>
      {/* Compact and medium only: the frames float the mini player above the tab bar. Expanded windows get
          the sidebar footer instead (above). */}
      {expanded ? null : (
        <View
          pointerEvents="box-none"
          style={{
            bottom: miniPlayerBottom(Platform.OS, insets.bottom),
            end: MINI_PLAYER_SIDE,
            position: 'absolute',
            start: MINI_PLAYER_SIDE,
          }}
          testID="mini-player-dock"
        >
          <MiniPlayer variant="tabs" />
        </View>
      )}
    </View>
  );
}
