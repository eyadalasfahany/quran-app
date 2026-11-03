import { Pressable } from 'react-native';

import { useTheme } from '@/core/theme';
import { Icon, useContrastColors } from '@/shared/ui';

const CLOSE = { ios: 'xmark', android: 'close' } as const;

/** The tip's ✕ (ADR 0053): ends the guided tour. A light glyph on the brand surface, with a 44 pt target. */
export function DiscoverTipCloseButton({ label, onPress, testID }: { label: string; onPress: () => void; testID?: string }) {
  const theme = useTheme();
  const colors = useContrastColors();

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        height: theme.size.touchTarget,
        justifyContent: 'center',
        opacity: pressed ? theme.opacity.pressed : 1,
        width: theme.size.touchTarget,
      })}
      testID={testID}
    >
      <Icon color={colors.onBrand} name={CLOSE} size={theme.size.iconSm} />
    </Pressable>
  );
}
