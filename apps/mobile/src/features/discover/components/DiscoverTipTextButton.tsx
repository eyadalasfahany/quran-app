import { Pressable } from 'react-native';

import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui';

/**
 * A text button on the green tip (ADR 0053): «تخطي». Light text on the brand surface, so it reads where the design
 * system's ghost button (brand text) would vanish. 44 pt tall.
 */
export function DiscoverTipTextButton({ label, onPress, testID }: { label: string; onPress: () => void; testID?: string }) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={theme.space[1]}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: theme.size.touchTarget,
        opacity: pressed ? theme.opacity.pressed : 1,
        paddingHorizontal: theme.space[3],
      })}
      testID={testID}
    >
      <UiText tone="onBrand" variant="caption" weight={600}>
        {label}
      </UiText>
    </Pressable>
  );
}
