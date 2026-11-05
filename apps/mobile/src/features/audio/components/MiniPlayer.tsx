import { router, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { formatNumber } from '@/core/i18n/numbers';
import type { Locale } from '@/core/i18n/locale';
import { useLocale } from '@/core/i18n/useLocale';
import { useTheme } from '@/core/theme';
import { GlassSurface, UiText } from '@/shared/ui';
import { useLastReadVerseKey } from '@/features/reader/anchor/useLastReadVerseKey';

import type { CatalogReciter } from '../data/reciters';
import { useActiveAyahNumber } from '../hooks/useActiveAyahNumber';
import { useIdleReciter } from '../hooks/useIdleReciter';
import { useIsStarting } from '../hooks/useIsStarting';
import { useMiniPlayerVisible } from '../hooks/useMiniPlayerVisible';
import { useMiniUnavailable } from '../hooks/useMiniUnavailable';
import { useSkipNoticeMessage } from '../hooks/useSkipNoticeMessage';
import { usePlayerNames } from '../hooks/usePlayerNames';
import { useVerseCaption } from '../hooks/useVerseCaption';
import {
  MINI_PLAYER_BUTTON_SIZE,
  MINI_PLAYER_GAP,
  MINI_PLAYER_GLYPH_SIZE,
  MINI_PLAYER_METRICS,
  MINI_PLAYER_NOTICE_HEIGHT,
  type MiniPlayerVariant,
} from '../mini-player-metrics';
import { pause } from '../player';
import { playVerse } from '../play-verse';
import { playbackFraction, reciterInitial } from '../player-view';
import { usePlayerStore } from '../playerStore';
import { chapterDisplayName, getChapter } from '@/features/reader/data/chapters';
import { openContentDb } from '@/core/db/content/open';
import { MiniPlayerProgressLine } from './MiniPlayerProgressLine';
import { ReaderMiniPlayer } from './ReaderMiniPlayer';
import { MiniPlayerTile } from './MiniPlayerTile';
import { MiniPlayerNotice } from './MiniPlayerNotice';
import { PlayerIconButton } from './PlayerIconButton';
import { PAUSE_ICON, PLAY_ICON } from './player-icons';

// A surah's bare name in the app's language, or '' when the content database has no such surah yet.
function surahBareName(chapterId: number, locale: Locale): string {
  try {
    const chapter = getChapter(openContentDb().executor, chapterId);
    return chapter === undefined ? '' : chapterDisplayName(chapter, locale);
  } catch {
    return '';
  }
}

// The reciter's name in the app's language, or '' when no reciter resolves.
function reciterDisplayName(reciter: CatalogReciter | null, locale: string): string {
  if (reciter === null) {
    return '';
  }
  return (locale === 'ar' ? reciter.nameAr ?? reciter.name : reciter.name ?? reciter.nameAr) ?? '';
}

/**
 * The mini player. While audio plays or loads it shows what is playing, and its button pauses. In every other state
 * (idle, paused, error) it shows the current ayah (`reader.lastVerseKey`, ADR 0046) with the reciter a play would use,
 * and its button starts that ayah from its beginning.
 */
export function MiniPlayer({ variant }: { variant: MiniPlayerVariant }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const status = usePlayerStore((state) => state.status);
  const positionMs = usePlayerStore((state) => state.positionMs);
  const durationMs = usePlayerStore((state) => state.durationMs);
  const { reciterName, chapterName } = usePlayerNames();
  const ayahNumber = useActiveAyahNumber();
  const visible = useMiniPlayerVisible(variant);
  const current = useLastReadVerseKey();
  const isPlaying = status === 'playing' || status === 'loading';
  const notPlaying = !isPlaying;
  // Any start, from a tap on any play control, shows the pause glyph and the buffering ring (ADR 0046).
  const starting = useIsStarting();
  const showPause = isPlaying || starting;
  const idleReciter = useIdleReciter(notPlaying);
  const idleCaption = useVerseCaption(notPlaying ? current : null);
  const unavailable = useMiniUnavailable();
  // The skip notice (ADR 0062) draws only while audio plays, with the rest of the playing bar.
  const skipMessage = useSkipNoticeMessage();
  const notice = isPlaying ? skipMessage : null;

  if (!visible) {
    return null;
  }

  const onToggle = () => {
    if (isPlaying) {
      pause();
      return;
    }
    // A start is already under way: a second tap does nothing (it would start the same ayah again).
    if (starting) {
      return;
    }
    void playVerse(current);
  };
  const fraction = playbackFraction(positionMs, durationMs);
  const shownReciter = notPlaying ? reciterDisplayName(idleReciter, locale) : reciterName;
  const shownSurah = notPlaying ? idleCaption?.surah ?? '' : chapterName ?? '';
  const shownAyah = notPlaying ? idleCaption?.ayah ?? null : ayahNumber;
  const captioned = (surah: string, ayah: number | null) =>
    ayah === null
      ? surah
      : t('player.mini.caption', { surah, ayah: t('ui.ayahNumber', { number: formatNumber(ayah, locale) }) });


  if (variant === 'reader') {
    const readerSubtitle = captioned(shownSurah, shownAyah);
    const unavailableNotice =
      unavailable === null
        ? undefined
        : {
            message: t('player.mini.unavailable', {
              surah: surahBareName(unavailable.chapterId, locale),
              reciter: shownReciter,
            }),
            // The reciter picker is the Listen tab (SettingsScreen does the same).
            onChangeReciter: () => router.navigate('/(main)/(listen)' as Href),
          };

    return (
      <ReaderMiniPlayer
        fraction={fraction}
        idle={notPlaying}
        onOpen={() => router.push('/player')}
        onToggle={onToggle}
        notice={notice}
        playing={isPlaying}
        reciterName={shownReciter}
        starting={starting}
        subtitle={readerSubtitle}
        unavailable={unavailableNotice}
      />
    );
  }

  const metrics = MINI_PLAYER_METRICS[variant];
  const subtitle = notPlaying ? captioned(shownSurah, shownAyah) : shownSurah;

  return (
    <GlassSurface
      radius="lg"
      style={{
        alignItems: 'center',
        flexDirection: 'row',
        gap: MINI_PLAYER_GAP,
        minHeight: metrics.height + (notice === null ? 0 : MINI_PLAYER_NOTICE_HEIGHT),
        overflow: 'hidden',
        paddingEnd: metrics.paddingEnd,
        paddingStart: metrics.paddingStart,
      }}
      testID={`mini-player-${variant}`}
    >
      {isPlaying ? <MiniPlayerProgressLine fraction={fraction} /> : null}
      <Pressable
        accessibilityHint={t('player.mini.hint')}
        accessibilityLabel={t('player.mini.label', { reciter: shownReciter, surah: subtitle })}
        accessibilityRole="button"
        onPress={() => router.push('/player')}
        style={{ alignItems: 'center', flex: 1, flexDirection: 'row', gap: MINI_PLAYER_GAP, height: '100%', minWidth: 0 }}
        testID="mini-player-open"
      >
        <MiniPlayerTile
          glyph={metrics.tileGlyph}
          letter={reciterInitial(shownReciter)}
          radius={metrics.tileRadius}
          size={metrics.tileSize}
        />
        <View style={{ flex: 1, minWidth: 0 }}>
          <UiText numberOfLines={1} scale="bar" variant={metrics.title.variant} weight={metrics.title.weight}>
            {shownReciter}
          </UiText>
          <UiText numberOfLines={1} scale="bar" tone="muted" variant={metrics.subtitle.variant} weight={metrics.subtitle.weight}>
            {subtitle}
          </UiText>
          {notice === null ? null : <MiniPlayerNotice message={notice} testID="mini-player-notice" />}
        </View>
      </Pressable>
      <PlayerIconButton
        background={theme.colors.brand}
        glyphColor={theme.colors.onBrand}
        glyphSize={MINI_PLAYER_GLYPH_SIZE}
        hitSize={MINI_PLAYER_BUTTON_SIZE}
        icon={showPause ? PAUSE_ICON : PLAY_ICON}
        label={showPause ? t('player.pause') : t('player.play')}
        onPress={onToggle}
        starting={starting}
        testID="mini-player-toggle"
      />
    </GlassSurface>
  );
}
