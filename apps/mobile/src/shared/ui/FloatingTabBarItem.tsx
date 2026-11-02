import { Pressable, type GestureResponderEvent } from 'react-native';

import { FLOATING_TAB_BAR } from '@/core/layout/tab-bar-clearance';
import { useTheme } from '@/core/theme';

import { Icon, type IconName } from './Icon';
import { UiText } from './UiText';
import { useContrastColors } from './useContrastColors';

// One tab in the Android floating bar (ADR 0033 §2). The selected tab's pill wraps its icon and label; the label
// weight picks the font file (headline 600 when selected, label 500 otherwise), never fontWeight.
export function FloatingTabBarItem({
  icon,
  label,
  selected,
  onPress,
  testID,
}: {
  icon: IconName;
  label: string;
  selected: boolean;
  onPress?: (event: GestureResponderEvent) => void;
  testID?: string;
}) {
  const theme = useTheme();
  const colors = useContrastColors();
  const tint = selected ? theme.colors.brand : colors.inkMuted;

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: selected ? theme.colors.glassSelected : 'transparent',
        borderRadius: FLOATING_TAB_BAR.itemRadius,
        flex: 1,
        gap: theme.space[1],
        justifyContent: 'center',
        minHeight: theme.size.touchTarget,
        opacity: pressed ? theme.opacity.pressed : 1,
      })}
      testID={testID}
    >
      <Icon color={tint} name={icon} size={theme.size.iconLg} />
      {/* Bar cap, like the other chrome labels: a rail or bar item is 76 pt or 64 pt high and cannot take the 2x content cap. */}
      <UiText scale="bar" tone={selected ? 'brand' : 'muted'} variant="label" weight={selected ? 600 : 500}>
        {label}
      </UiText>
    </Pressable>
  );
}
