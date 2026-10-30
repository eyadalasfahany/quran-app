import { I18nManager, Pressable } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useTheme } from '@/core/theme';
import { useContrastColors } from '@/shared/ui';

const PLAY_GLYPH = 'M8 5v14l11-7z';
const PAUSE_GLYPH = 'M6 5h4v14H6zM14 5h4v14h-4z';

// The 44 pt play button on a recent listen (quran-app-screens.html, #Main). The most recent row is filled
// brand with an onBrand glyph; the others are surfaceRaised with a line border and a brand glyph.
// The play triangle flips with the layout direction; while `playing`, the button draws a symmetric pause glyph.
export function RecentListenPlayButton({
  label,
  filled,
  playing = false,
  onPress,
  testID,
}: {
  label: string;
  filled: boolean;
  /** This listen is playing: the button draws pause. */
  playing?: boolean;
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
      <Svg
        height={theme.size.iconSm}
        style={!playing && I18nManager.isRTL ? { transform: [{ scaleX: -1 }] } : undefined}
        testID={testID ? `${testID}-glyph` : undefined}
        viewBox="0 0 24 24"
        width={theme.size.iconSm}
      >
        <Path d={playing ? PAUSE_GLYPH : PLAY_GLYPH} fill={filled ? theme.colors.onBrand : theme.colors.brand} />
      </Svg>
    </Pressable>
  );
}
