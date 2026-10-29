import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { GlassSurface, UiText } from '@/shared/ui';

import { usePlayerNames } from '../hooks/usePlayerNames';
import {
  MINI_PLAYER_BUTTON_SIZE,
  MINI_PLAYER_GAP,
  MINI_PLAYER_GLYPH_SIZE,
  MINI_PLAYER_METRICS,
  type MiniPlayerVariant,
} from '../mini-player-metrics';
import { pause, resume } from '../player';
import { playbackFraction, reciterInitial } from '../player-view';
import { usePlayerStore } from '../playerStore';
import { MiniPlayerProgressLine } from './MiniPlayerProgressLine';
import { MiniPlayerTile } from './MiniPlayerTile';
import { PlayerIconButton } from './PlayerIconButton';
import { PAUSE_ICON, PLAY_ICON } from './player-icons';

// The bar shown above the tabs (`tabs`) and at the foot of the reader (`reader`). It draws nothing while the
// player is idle. Tapping the bar opens the full player; the button beside it toggles playback. The two are
// siblings, so the button is never inside another button.
export function MiniPlayer({ variant }: { variant: MiniPlayerVariant }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const status = usePlayerStore((state) => state.status);
  const positionMs = usePlayerStore((state) => state.positionMs);
  const durationMs = usePlayerStore((state) => state.durationMs);
  const { reciterName, chapterName } = usePlayerNames();

  if (status === 'idle') {
    return null;
  }

  const metrics = MINI_PLAYER_METRICS[variant];
  const isPlaying = status === 'playing' || status === 'loading';
  const subtitle = chapterName ?? '';
  const toggle = () => {
    if (isPlaying) {
      pause();
      return;
    }
    void resume();
  };

  return (
    <GlassSurface
      radius="lg"
      style={{
        alignItems: 'center',
        flexDirection: 'row',
        gap: MINI_PLAYER_GAP,
        height: metrics.height,
        overflow: 'hidden',
        paddingEnd: metrics.paddingEnd,
        paddingStart: metrics.paddingStart,
      }}
      testID={`mini-player-${variant}`}
    >
      <MiniPlayerProgressLine fraction={playbackFraction(positionMs, durationMs)} />
      <Pressable
        accessibilityHint={t('player.mini.hint')}
        accessibilityLabel={t('player.mini.label', { reciter: reciterName, surah: subtitle })}
        accessibilityRole="button"
        onPress={() => router.push('/player')}
        style={{ alignItems: 'center', flex: 1, flexDirection: 'row', gap: MINI_PLAYER_GAP, height: '100%', minWidth: 0 }}
        testID="mini-player-open"
      >
        <MiniPlayerTile
          glyph={metrics.tileGlyph}
          letter={reciterInitial(reciterName)}
          radius={metrics.tileRadius}
          size={metrics.tileSize}
        />
        <View style={{ flex: 1, minWidth: 0 }}>
          <UiText numberOfLines={1} scale="bar" variant={metrics.title.variant} weight={metrics.title.weight}>
            {reciterName}
          </UiText>
          <UiText numberOfLines={1} scale="bar" tone="muted" variant={metrics.subtitle.variant} weight={metrics.subtitle.weight}>
            {subtitle}
          </UiText>
        </View>
      </Pressable>
      <PlayerIconButton
        background={theme.colors.brand}
        glyphColor={theme.colors.onBrand}
        glyphSize={MINI_PLAYER_GLYPH_SIZE}
        hitSize={MINI_PLAYER_BUTTON_SIZE}
        icon={isPlaying ? PAUSE_ICON : PLAY_ICON}
        label={isPlaying ? t('player.pause') : t('player.play')}
        onPress={toggle}
        testID="mini-player-toggle"
      />
    </GlassSurface>
  );
}
