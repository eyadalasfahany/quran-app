import { SymbolView } from 'expo-symbols';
import type { AndroidSymbol, SFSymbol } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useTheme } from '@/core/theme';

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
  const color = selected ? theme.colors.brand : theme.colors.ink;

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
        fallback={<View style={{ height: 24, width: 24 }} />}
        name={{ ios: symbol, android: androidIcon }}
        size={24}
        tintColor={color}
      />
      <Text style={[theme.text.headline, { color }]}>{label}</Text>
    </Pressable>
  );
}
