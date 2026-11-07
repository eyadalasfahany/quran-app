import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { useTheme } from '@/core/theme';
import { useContrastColors } from '@/shared/ui';

const PLAY_GLYPH = 'M8 5v14l11-7z';
const GLYPH_SIZE = 16;

/**
 * The 44 pt play button on one adhan voice row (screens/, #AdhanSoundPicker). It plays the clip, or stops it
 * while it plays. The label names the voice (ADR 0047): «تشغيل» / «إيقاف» with the voice name.
 */
export function AdhanPreviewButton({
  name,
  playing,
  onPress,
  testID,
}: {
  /** The voice's display name, read by the label. */
  name: string;
  playing: boolean;
  onPress: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useContrastColors();
  const size = theme.size.touchTarget;

  return (
    <Pressable
      accessibilityLabel={playing ? t('salah.adhanSound.stopPreview', { name }) : t('salah.adhanSound.preview', { name })}
      accessibilityRole="button"
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
      <Svg height={GLYPH_SIZE} testID={testID ? `${testID}-glyph` : undefined} viewBox="0 0 24 24" width={GLYPH_SIZE}>
        {playing ? (
          <Rect fill={theme.colors.brand} height={12} rx={2} width={12} x={6} y={6} />
        ) : (
          <Path d={PLAY_GLYPH} fill={theme.colors.brand} />
        )}
      </Svg>
    </Pressable>
  );
}
