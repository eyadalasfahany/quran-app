import type { AndroidSymbol, SFSymbol } from 'expo-symbols';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/core/theme';

import { GlassSurface } from './GlassSurface';
import { SidebarItem } from './SidebarItem';

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
          gap: theme.space[1],
          paddingHorizontal: theme.space[3],
          paddingVertical: theme.space[4],
          width: theme.size.sidebar,
        }}
        testID="sidebar"
      >
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
      </GlassSurface>
    </View>
  );
}
