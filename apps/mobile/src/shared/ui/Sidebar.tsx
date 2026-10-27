import { GlassView } from 'expo-glass-effect';
import type { AndroidSymbol, SFSymbol } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useGlass, useTheme } from '@/core/theme';

import { SidebarItem } from './SidebarItem';

// Width from the expanded-window drawing in quran-app-screens.html.
const SIDEBAR_WIDTH = 300;

export type SidebarEntry = {
  key: string;
  label: string;
  symbol: SFSymbol;
  androidIcon: AndroidSymbol;
  selected: boolean;
  onPress: () => void;
  testID: string;
};

export function Sidebar({ label, items }: { label: string; items: readonly SidebarEntry[] }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const nativeGlass = useGlass();
  const surface = {
    borderRadius: theme.radius.xl,
    flex: 1,
    gap: theme.space[1],
    paddingHorizontal: theme.space[3],
    paddingVertical: theme.space[4],
    width: SIDEBAR_WIDTH,
  };
  const entries = items.map((item) => (
    <SidebarItem
      key={item.key}
      androidIcon={item.androidIcon}
      label={item.label}
      onPress={item.onPress}
      selected={item.selected}
      symbol={item.symbol}
      testID={item.testID}
    />
  ));

  return (
    <View
      style={{
        paddingBottom: insets.bottom + theme.space[4],
        paddingStart: theme.space[4],
        paddingTop: insets.top + theme.space[4],
      }}
    >
      {nativeGlass ? (
        <GlassView
          accessibilityLabel={label}
          accessibilityRole="tablist"
          glassEffectStyle="regular"
          style={surface}
          testID="sidebar"
        >
          {entries}
        </GlassView>
      ) : (
        <View
          accessibilityLabel={label}
          accessibilityRole="tablist"
          style={{
            ...surface,
            backgroundColor: theme.colors.glassFallback,
            borderColor: theme.colors.line,
            borderWidth: StyleSheet.hairlineWidth,
          }}
          testID="sidebar"
        >
          {entries}
        </View>
      )}
    </View>
  );
}
