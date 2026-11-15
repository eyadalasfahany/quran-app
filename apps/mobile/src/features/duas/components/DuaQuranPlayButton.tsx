import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';

import { useTheme } from '@/core/theme';
import { BufferingRing } from '@/shared/ui/BufferingRing';
import { Icon, type IconName } from '@/shared/ui/Icon';
import type { RangePlaybackState } from '@/features/audio/hooks/useRangePlayback';

// The player glyphs: play points right in both languages and pause never flips (ADR 0029), as the player's own.
const PLAY_ICON = { ios: 'play.fill', android: 'play_arrow' } as const satisfies IconName;
const PAUSE_ICON = { ios: 'pause.fill', android: 'pause' } as const satisfies IconName;

/**
 * The play control of a Quranic dua's verse range (screens/, #DuaQuranDetailAudio and #DuaQuranDetailPlaying): a 44 pt
 * brand circle in the action row. It shows pause while the range starts or plays (every play control shows pause while
 * its audio plays, ADR 0025), with the buffering ring while it starts. Unavailable, it is disabled; the reason is drawn
 * by the screen. Presentational: the state and the tap come from `useRangePlayback`.
 */
export function DuaQuranPlayButton({
  state,
  onPress,
  testID = 'dua-quran-play',
}: {
  state: RangePlaybackState;
  onPress: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const starting = state === 'starting';
  const showPause = state === 'playing' || starting;
  const disabled = state === 'unavailable';
  const side = Math.max(44, theme.size.touchTarget);
  const label = showPause ? t('duas.quranPlay.pause') : t('duas.quranPlay.play');

  return (
    <BufferingRing active={starting} color={theme.colors.onBrand} size={side} testID={`${testID}-ring`}>
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
        accessibilityState={{ busy: starting || undefined, disabled }}
        disabled={disabled}
        onPress={onPress}
        style={{
          alignItems: 'center',
          backgroundColor: theme.colors.brand,
          borderRadius: theme.radius.pill,
          height: side,
          justifyContent: 'center',
          opacity: disabled ? theme.opacity.disabled : 1,
          width: side,
        }}
        testID={testID}
      >
        <Icon color={theme.colors.onBrand} name={showPause ? PAUSE_ICON : PLAY_ICON} size={20} testID={`${testID}-icon`} />
      </Pressable>
    </BufferingRing>
  );
}
