import { Pressable } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { useTheme } from '@/core/theme';
import { useContrastColors } from '@/shared/ui';

const PLAY_GLYPH = 'M8 5v14l11-7z';
const PAUSE_GLYPH = 'M6 5h4v14H6zM14 5h4v14h-4z';
const GLYPH_SIZE = 16;
const RING_RADIUS = 21; // Sits on the 1 pt border of the 44 pt button.

// The row's play button. While `progress` is a number (0 to 1) a determinate ring fills around it.
// The frame has no downloading state; the ring is the design gap the step brief asks the developer to approve.
// The play triangle never flips: playback glyphs map to the timeline, not the reading direction.
export function ReciterPlayButton({
  label,
  progress,
  hint,
  playing = false,
  onPress,
  testID,
}: {
  label: string;
  /** null when no pack is downloading. */
  progress: number | null;
  hint?: string;
  /** This reciter is playing: the button draws pause. */
  playing?: boolean;
  onPress: () => void;
  testID?: string;
}) {
  const theme = useTheme();
  const colors = useContrastColors();
  const size = theme.size.touchTarget;
  const downloading = progress !== null;
  const fraction = Math.min(1, Math.max(0, progress ?? 0));
  const circumference = 2 * Math.PI * RING_RADIUS;

  return (
    <Pressable
      accessibilityHint={hint}
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ busy: downloading }}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: theme.colors.surfaceRaised,
        borderColor: colors.line,
        borderRadius: size / 2,
        borderWidth: theme.stroke.hairline,
        height: size,
        justifyContent: 'center',
        opacity: pressed ? theme.opacity.pressed : 1,
        width: size,
      })}
      testID={testID}
    >
      <Svg
        height={GLYPH_SIZE}
        testID={testID ? `${testID}-glyph` : undefined}
        viewBox="0 0 24 24"
        width={GLYPH_SIZE}
      >
        <Path d={playing ? PAUSE_GLYPH : PLAY_GLYPH} fill={theme.colors.brand} />
      </Svg>
      {downloading ? (
        <Svg
          height={size}
          style={{ position: 'absolute' }}
          testID={testID ? `${testID}-ring` : undefined}
          viewBox={`0 0 ${size} ${size}`}
          width={size}
        >
          <Circle
            cx={size / 2}
            cy={size / 2}
            fill="none"
            r={RING_RADIUS}
            stroke={colors.line}
            strokeWidth={theme.stroke.selectedRing}
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            fill="none"
            r={RING_RADIUS}
            stroke={theme.colors.brand}
            strokeDasharray={[circumference, circumference]}
            strokeDashoffset={circumference * (1 - fraction)}
            strokeLinecap="round"
            strokeWidth={theme.stroke.selectedRing}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
      ) : null}
    </Pressable>
  );
}
