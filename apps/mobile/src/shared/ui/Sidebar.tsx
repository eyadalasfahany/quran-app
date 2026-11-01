import type { AndroidSymbol, SFSymbol } from 'expo-symbols';
import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';

import { HIDDEN_SCROLL_INDICATORS } from '@/core/layout/hide-scroll-indicators';
import { useScreenInsets } from '@/core/layout/useScreenInsets';
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

// The destinations scroll when they are taller than the window (a landscape phone is about 400 pt tall). The footer
// (the expanded mini player) stays pinned below them. The side insets follow the reading direction.
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
  const insets = useScreenInsets();

  return (
    <View
      style={{
        paddingBottom: insets.bottom + theme.space[4],
        paddingEnd: insets.end,
        paddingStart: insets.start + theme.space[4],
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
        <ScrollView
          {...HIDDEN_SCROLL_INDICATORS}
          contentContainerStyle={{ gap: theme.space[2] }}
          style={{ flex: 1 }}
          testID="sidebar-scroll"
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
        </ScrollView>
        {footer ? <View testID="sidebar-footer">{footer}</View> : null}
      </GlassSurface>
    </View>
  );
}
