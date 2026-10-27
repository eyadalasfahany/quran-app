import { Pressable } from 'react-native';

import { useTheme } from '@/core/theme';

import { GlassSurface } from './GlassSurface';
import { Icon, type IconName } from './Icon';

export const ICON_BUTTON_SIZE = 44;

export type IconButtonVariant = 'plain' | 'filled' | 'glass';

export function IconButton({
  icon,
  label,
  onPress,
  pressed,
  variant = 'plain',
  mirrorInRtl = false,
  testID,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  // A toggle's on state (for example, the page is bookmarked), not the touch-down state.
  pressed?: boolean;
  variant?: IconButtonVariant;
  mirrorInRtl?: boolean;
  testID?: string;
}) {
  const theme = useTheme();
  const color = pressed ? theme.colors.brand : theme.colors.ink;
  const resting = variant === 'filled' ? theme.colors.fillSecondary : 'transparent';

  const button = (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={pressed === undefined ? undefined : { selected: pressed }}
      onPress={onPress}
      style={({ pressed: touching }) => ({
        alignItems: 'center',
        backgroundColor: pressed || touching ? theme.colors.glassSelected : resting,
        borderRadius: theme.radius.pill,
        height: ICON_BUTTON_SIZE,
        justifyContent: 'center',
        width: ICON_BUTTON_SIZE,
      })}
      testID={testID}
    >
      <Icon color={color} mirrorInRtl={mirrorInRtl} name={icon} />
    </Pressable>
  );

  if (variant === 'glass') {
    return <GlassSurface radius="pill">{button}</GlassSurface>;
  }
  return button;
}
