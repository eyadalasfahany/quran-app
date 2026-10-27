import { SymbolView } from 'expo-symbols';
import type { AndroidSymbol, SFSymbol } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/core/theme';

import { UiText } from './UiText';

export function SidebarItem({
  label,
  symbol,
  androidIcon,
  selected,
  onPress,
  testID,
}: {
  label: string;
  symbol: SFSymbol;
  androidIcon: AndroidSymbol;
  selected: boolean;
  onPress: () => void;
  testID: string;
}) {
  const theme = useTheme();
  const [hovered, setHovered] = useState(false);
  const iconSize = theme.size.iconLg;

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: selected || pressed || hovered ? theme.colors.glassSelected : 'transparent',
        borderRadius: theme.radius.pill,
        flexDirection: 'row',
        gap: theme.space[3],
        minHeight: 48,
        paddingHorizontal: theme.space[3],
      })}
      testID={testID}
    >
      <SymbolView
        fallback={<View style={{ height: iconSize, width: iconSize }} />}
        name={{ ios: symbol, android: androidIcon }}
        size={iconSize}
        tintColor={selected ? theme.colors.brand : theme.colors.ink}
      />
      <UiText tone={selected ? 'brand' : 'ink'} variant="headline">
        {label}
      </UiText>
    </Pressable>
  );
}
