import { Pressable } from 'react-native';

import { useTheme } from '@/core/theme';
import { Icon, type IconName } from '@/shared/ui/Icon';

/**
 * The Qibla screen's round glass header buttons (back, location). 44 pt, the player
 * glass tokens on the player-dark canvas (quran-app-screens.html, #Qibla).
 */
export function QiblaIconButton({
  icon,
  label,
  onPress,
  disabled = false,
  glyphSize,
  mirrorInRtl = false,
  testID,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** Defaults to the frame's 20 pt header glyph. */
  glyphSize?: number;
  /** Directional glyphs (the back chevron) flip with the layout direction. */
  mirrorInRtl?: boolean;
  testID?: string;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{
        alignItems: 'center',
        backgroundColor: theme.colors.playerGlassFill,
        borderColor: theme.colors.playerGlassStroke,
        borderRadius: theme.radius.pill,
        borderWidth: 1,
        height: theme.size.touchTarget,
        justifyContent: 'center',
        opacity: disabled ? theme.opacity.disabled : 1,
        width: theme.size.touchTarget,
      }}
      testID={testID}
    >
      <Icon
        color={theme.colors.playerInk}
        mirrorInRtl={mirrorInRtl}
        name={icon}
        size={glyphSize ?? theme.size.iconMd}
        testID={testID ? `${testID}-icon` : undefined}
      />
    </Pressable>
  );
}
