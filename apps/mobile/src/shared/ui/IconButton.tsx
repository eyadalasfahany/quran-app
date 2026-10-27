import { size } from '@quran/design-tokens';
import { Pressable } from 'react-native';

import { useTheme } from '@/core/theme';

import { GlassSurface } from './GlassSurface';
import { Icon, type IconName } from './Icon';

export const ICON_BUTTON_SIZE = size.touchTarget;

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
        height: theme.size.touchTarget,
        justifyContent: 'center',
        width: theme.size.touchTarget,
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
