import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { formatNumber } from '@/core/i18n/numbers';
import { useLocale } from '@/core/i18n/useLocale';
import { useTheme } from '@/core/theme';
import { GlassSurface, UiText } from '@/shared/ui';

import { useActiveAyahNumber } from '../hooks/useActiveAyahNumber';
import { useMiniPlayerVisible } from '../hooks/useMiniPlayerVisible';
import { usePlayerNames } from '../hooks/usePlayerNames';
import {
  MINI_PLAYER_BUTTON_SIZE,
  MINI_PLAYER_GAP,
  MINI_PLAYER_GLYPH_SIZE,
  MINI_PLAYER_METRICS,
  MINI_PLAYER_SIDEBAR,
  type MiniPlayerVariant,
} from '../mini-player-metrics';
import { useIdleReciter } from '../hooks/useIdleReciter';
import { useVerseCaption } from '../hooks/useVerseCaption';
import { pause, resume } from '../player';
import { playVerse } from '../play-verse';
import { playbackFraction, reciterInitial } from '../player-view';
import { usePlayerStore } from '../playerStore';
import { MiniPlayerProgressLine } from './MiniPlayerProgressLine';
import { ReaderMiniPlayer } from './ReaderMiniPlayer';
import { MiniPlayerTile } from './MiniPlayerTile';
import { PlayerIconButton } from './PlayerIconButton';
import { PAUSE_ICON, PLAY_ICON } from './player-icons';

// The bar shown above the tabs (`tabs`) and at the foot of the reader (`reader`), and the solid footer of the
// expanded sidebar (`sidebar`). It draws nothing while useMiniPlayerVisible is false. Tapping the row opens the
// full player; the button beside it toggles playback. The two are siblings, so the button is never inside another button.
export function MiniPlayer({ variant, topVerseKey = null }: { variant: MiniPlayerVariant; topVerseKey?: string | null }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const status = usePlayerStore((state) => state.status);
  const positionMs = usePlayerStore((state) => state.positionMs);
  const durationMs = usePlayerStore((state) => state.durationMs);
  const { reciterName, chapterName } = usePlayerNames();
  const ayahNumber = useActiveAyahNumber();
  const visible = useMiniPlayerVisible(variant);
  const idle = status === 'idle';
  // The reader's idle bar: the reciter a play would use, and the caption of the top ayah on screen.
  const idleReciter = useIdleReciter(variant === 'reader' && idle);
  const idleCaption = useVerseCaption(variant === 'reader' && idle ? topVerseKey : null);

  if (!visible) {
    return null;
  }

  const isPlaying = status === 'playing' || status === 'loading';
  const toggle = () => {
    if (isPlaying) {
      pause();
      return;
    }
    void resume();
  };
  const fraction = playbackFraction(positionMs, durationMs);

  if (variant === 'sidebar') {
    // The caption is the surah plus the ayah while one is active («الكهف · الآية ١٠»), else the surah alone.
    const surah = chapterName ?? '';
    const subtitle =
      ayahNumber === null
        ? surah
        : t('player.mini.caption', { surah, ayah: t('ui.ayahNumber', { number: formatNumber(ayahNumber, locale) }) });

    return (
      <View
        style={{
          backgroundColor: theme.colors.surfaceRaised,
          borderColor: theme.colors.line,
          borderRadius: MINI_PLAYER_SIDEBAR.radius,
          borderWidth: theme.stroke.hairline,
          gap: MINI_PLAYER_GAP,
          padding: MINI_PLAYER_SIDEBAR.padding,
        }}
        testID="mini-player-sidebar"
      >
        <View style={{ alignItems: 'center', flexDirection: 'row', gap: MINI_PLAYER_GAP }}>
          <Pressable
            accessibilityHint={t('player.mini.hint')}
            accessibilityLabel={t('player.mini.label', { reciter: reciterName, surah: subtitle })}
            accessibilityRole="button"
            onPress={() => router.push('/player')}
            style={{ alignItems: 'center', flex: 1, flexDirection: 'row', gap: MINI_PLAYER_GAP, minWidth: 0 }}
            testID="mini-player-open"
          >
            <MiniPlayerTile
              glyph="brand"
              letter={reciterInitial(reciterName)}
              radius={MINI_PLAYER_SIDEBAR.tileRadius}
              size={MINI_PLAYER_SIDEBAR.tileSize}
            />
            <View style={{ flex: 1, minWidth: 0 }}>
              <UiText variant={MINI_PLAYER_SIDEBAR.title.variant} weight={MINI_PLAYER_SIDEBAR.title.weight}>
                {reciterName}
              </UiText>
              <UiText numberOfLines={1} tone="muted" variant={MINI_PLAYER_SIDEBAR.subtitle.variant} weight={MINI_PLAYER_SIDEBAR.subtitle.weight}>
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
            mirrorInRtl
            onPress={toggle}
            testID="mini-player-toggle"
          />
        </View>
        <MiniPlayerProgressLine fraction={fraction} placement="inline" />
      </View>
    );
  }

  // Plays from the top ayah on screen with the catalogue's reciter (installing its pack first if needed).
  const playIdle = (verseKey: string | null) => {
    if (verseKey !== null) {
      void playVerse(verseKey);
    }
  };

  if (variant === 'reader') {
    const idleName = idleReciter === null ? '' : (locale === 'ar' ? idleReciter.nameAr ?? idleReciter.name : idleReciter.name ?? idleReciter.nameAr) ?? '';
    const surah = idle ? idleCaption?.surah ?? '' : chapterName ?? '';
    // Reading shows the ayah beside the surah, as the frame does (#Reading, #ReadingMiniIdle).
    const ayah = idle ? idleCaption?.ayah ?? null : ayahNumber;
    const readerSubtitle =
      ayah === null
        ? surah
        : t('player.mini.caption', { surah, ayah: t('ui.ayahNumber', { number: formatNumber(ayah, locale) }) });

    return (
      <ReaderMiniPlayer
        fraction={fraction}
        idle={idle}
        onOpen={() => router.push('/player')}
        onToggle={idle ? () => playIdle(topVerseKey) : toggle}
        playing={isPlaying}
        reciterName={idle ? idleName : reciterName}
        subtitle={readerSubtitle}
      />
    );
  }

  const metrics = MINI_PLAYER_METRICS[variant];
  const subtitle = chapterName ?? '';

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
      <MiniPlayerProgressLine fraction={fraction} />
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
        mirrorInRtl
        onPress={toggle}
        testID="mini-player-toggle"
      />
    </GlassSurface>
  );
}
