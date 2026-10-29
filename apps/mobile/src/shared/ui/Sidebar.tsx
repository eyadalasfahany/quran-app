import type { AndroidSymbol, SFSymbol } from 'expo-symbols';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/core/theme';

import { GlassSurface } from './GlassSurface';
import { SidebarItem } from './SidebarItem';
import { SidebarSearch } from './SidebarSearch';

export type SidebarEntry = {
  key: string;
  label: string;
  symbol: SFSymbol;
  androidIcon: AndroidSymbol;
  selected: boolean;
  onPress: () => void;
  testID: string;
};

export function Sidebar({
  label,
  items,
  search,
  footer,
}: {
  label: string;
  items: readonly SidebarEntry[];
  search?: { label: string; onPress: () => void };
  /** Pinned to the bottom of the sidebar, below the destinations (the expanded mini player). */
  footer?: ReactNode;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        paddingBottom: insets.bottom + theme.space[4],
        paddingStart: theme.space[4],
        paddingTop: insets.top + theme.space[4],
      }}
    >
      <GlassSurface
        accessibilityLabel={label}
        accessibilityRole="tablist"
        radius="xl"
        style={{
          flex: 1,
          gap: theme.space[2],
          paddingHorizontal: theme.space[3],
          paddingVertical: theme.space[4],
          width: theme.size.sidebar,
        }}
        testID="sidebar"
      >
        {search ? <SidebarSearch label={search.label} onPress={search.onPress} testID="sidebar-search" /> : null}
        {items.map((item) => (
          <SidebarItem
            key={item.key}
            androidIcon={item.androidIcon}
            label={item.label}
            onPress={item.onPress}
            selected={item.selected}
            symbol={item.symbol}
            testID={item.testID}
          />
        ))}
        {footer ? (
          <>
            <View style={{ flex: 1 }} />
            <View testID="sidebar-footer">{footer}</View>
          </>
        ) : null}
      </GlassSurface>
    </View>
  );
}
