import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';

import { NEXT_AYAH_ICON, PAUSE_ICON, PLAY_ICON, PREVIOUS_AYAH_ICON } from './player-icons';
import { PlayerIconButton } from './PlayerIconButton';

// Previous ayah, play/pause, next ayah, in that order in the row. The row follows the layout direction, so Arabic
// shows next on the left and English shows it on the right. Directional glyphs flip with the direction; the
// play/pause glyph never does. Ayah steps stay disabled until audio-to-ayah timings exist.
export function PlayerTransport({
  isPlaying,
  stepsEnabled,
  onPrevious,
  onNext,
  onTogglePlay,
}: {
  isPlaying: boolean;
  stepsEnabled: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onTogglePlay: () => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View
      style={{ alignItems: 'center', flexDirection: 'row', gap: 28, justifyContent: 'center' }}
      testID="player-transport"
    >
      <PlayerIconButton
        disabled={!stepsEnabled}
        glyphSize={28}
        hitSize={52}
        icon={PREVIOUS_AYAH_ICON}
        label={t('player.previousAyah')}
        mirrorInRtl
        onPress={onPrevious}
        testID="player-previous"
      />
      <PlayerIconButton
        background={theme.colors.goldOnBrandSurface}
        glyphColor={theme.colors.playerBg}
        glyphSize={30}
        hitSize={76}
        radius={38}
        icon={isPlaying ? PAUSE_ICON : PLAY_ICON}
        label={isPlaying ? t('player.pause') : t('player.play')}
        onPress={onTogglePlay}
        testID="player-toggle"
      />
      <PlayerIconButton
        disabled={!stepsEnabled}
        glyphSize={28}
        hitSize={52}
        icon={NEXT_AYAH_ICON}
        label={t('player.nextAyah')}
        mirrorInRtl
        onPress={onNext}
        testID="player-next"
      />
    </View>
  );
}
