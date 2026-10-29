import { Pressable } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useTheme } from '@/core/theme';
import { useContrastColors } from '@/shared/ui';

const PLAY_GLYPH = 'M8 5v14l11-7z';

// The 44 pt play button on a recent listen (quran-app-screens.html, #Main). The most recent row is filled
// brand with an onBrand glyph; the others are surfaceRaised with a line border and a brand glyph.
export function RecentListenPlayButton({
  label,
  filled,
  onPress,
  testID,
}: {
  label: string;
  filled: boolean;
  onPress: () => void;
  testID?: string;
}) {
  const theme = useTheme();
  const colors = useContrastColors();
  const size = theme.size.touchTarget;

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: filled ? theme.colors.brand : theme.colors.surfaceRaised,
        borderColor: colors.line,
        borderRadius: size / 2,
        borderWidth: filled ? 0 : theme.stroke.hairline,
        height: size,
        justifyContent: 'center',
        opacity: pressed ? theme.opacity.pressed : 1,
        width: size,
      })}
      testID={testID}
    >
      <Svg height={theme.size.iconSm} viewBox="0 0 24 24" width={theme.size.iconSm}>
        <Path d={PLAY_GLYPH} fill={filled ? theme.colors.onBrand : theme.colors.brand} />
      </Svg>
    </Pressable>
  );
}
