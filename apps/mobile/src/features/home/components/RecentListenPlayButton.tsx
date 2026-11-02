import { Pressable } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useTheme } from '@/core/theme';
import { BufferingRing } from '@/shared/ui/BufferingRing';
import { useContrastColors } from '@/shared/ui';

// A tap while the listen starts does nothing: a second start would load the same listen again.
const ignoreTap = () => undefined;

const PLAY_GLYPH = 'M8 5v14l11-7z';
const PAUSE_GLYPH = 'M6 5h4v14H6zM14 5h4v14h-4z';

// The 44 pt play button on a recent listen (quran-app-screens.html, #Main). The most recent row is filled
// brand with an onBrand glyph; the others are surfaceRaised with a line border and a brand glyph.
// The play triangle never flips: playback glyphs map to the timeline, not the reading direction.
export function RecentListenPlayButton({
  label,
  filled,
  playing = false,
  starting = false,
  onPress,
  testID,
}: {
  label: string;
  filled: boolean;
  /** This listen is playing: the button draws pause. */
  playing?: boolean;
  /** This listen is starting: the button draws pause and the buffering ring turns. */
  starting?: boolean;
  onPress: () => void;
  testID?: string;
}) {
  const theme = useTheme();
  const colors = useContrastColors();
  const size = theme.size.touchTarget;

  return (
    <BufferingRing
      active={starting}
      color={filled ? theme.colors.onBrand : theme.colors.brand}
      size={size}
      testID={testID ? `${testID}-buffering` : undefined}
    >
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
          accessibilityState={{ busy: starting }}
        onPress={playing || !starting ? onPress : ignoreTap}
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
          testID={testID ? `${testID}-glyph` : undefined}
          viewBox="0 0 24 24"
          width={theme.size.iconSm}
        >
          <Path d={playing || starting ? PAUSE_GLYPH : PLAY_GLYPH} fill={filled ? theme.colors.onBrand : theme.colors.brand} />
        </Svg>
      </Pressable>
    </BufferingRing>
  );
}
