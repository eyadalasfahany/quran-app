import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { Locale } from '@/core/i18n/locale';
import { formatNumber } from '@/core/i18n/numbers';
import { useLocale } from '@/core/i18n/useLocale';
import { useGlass, useTheme } from '@/core/theme';
import { GlassSurface } from '@/shared/ui/GlassSurface';

import { useSurahVerses, verseNumberOf, type SurahVerse } from '../hooks/useSurahVerses';
import type { RepeatRange } from '../repeat';
import { usePlayerStore } from '../playerStore';
import { selectRemainingMinutes, useSleepTimerStore, type SleepMode } from '../sleep-timer';
import { RANGE_ICON, REPEAT_ICON, SLEEP_ICON, SPEED_ICON } from './player-icons';
import { PlayerOptionButton } from './PlayerOptionButton';
import { PlayerRangeMenu } from './PlayerRangeMenu';
import { PlayerRepeatMenu } from './PlayerRepeatMenu';
import { PlayerSleepMenu } from './PlayerSleepMenu';
import { PlayerSpeedMenu } from './PlayerSpeedMenu';

type OpenMenu = 'repeat' | 'range' | 'speed' | 'sleep' | null;

// The bottom glass group: repeat, the ayah range, speed and the sleep timer. Repeat opens its count menu; the range
// stays disabled until a recited ayah exists, and opens the range picker. Speed and the sleep timer open their menus;
// a running sleep timer shows its remaining minutes and takes the accent. The repeat and range labels read playerStore. Glass is the native material when it is on; otherwise the bar takes the frame's player
// glass tokens, not the theme's fallback, so it stays dark on the dark player screen.
// The speed comes from playerStore, not from the `speed` prop. The prop is ignored and kept only so PlayerScreen
// compiles until its owner drops it.
export function PlayerOptionsBar({ versesCount }: { versesCount: number; speed?: number }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const theme = useTheme();
  const nativeGlass = useGlass();
  const speed = usePlayerStore((state) => state.speed);
  const sleepMode = useSleepTimerStore((state) => state.mode);
  const remainingMinutes = useSleepTimerStore(selectRemainingMinutes);
  const repeat = usePlayerStore((state) => state.repeat);
  const activeVerseId = usePlayerStore((state) => state.activeVerseId);
  const chapterId = usePlayerStore((state) => state.chapterId);
  const verses = useSurahVerses(chapterId);
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  // The set range's numbers, or null when it is not set or its ayahs are not known.
  const repeatNumbers = repeat === null ? null : rangeNumbers(verses, repeat);
  // With a range set, the range is shown; otherwise the whole surah. With no surah loaded there is no range to show.
  const rangeLabel =
    repeatNumbers !== null
      ? t('player.options.range', { from: formatNumber(repeatNumbers.from, locale), to: formatNumber(repeatNumbers.to, locale) })
      : versesCount > 0
        ? t('player.options.range', { from: formatNumber(1, locale), to: formatNumber(versesCount, locale) })
        : t('player.options.rangeEmpty');
  const repeatItem = repeatLabels(repeat, rangeLabel, t as unknown as Translate, locale);
  const sleepTitle = t('player.options.sleep');
  const sleep = sleepLabels(sleepMode, remainingMinutes, t as unknown as Translate, locale);
  const sleepAccessibilityLabel = sleep.armed ? t('player.options.sleepArmed', { title: sleepTitle, state: sleep.spoken }) : sleepTitle;

  return (
    <>
      <GlassSurface
        // The player is dark in every app theme, so its glass must not follow the light appearance.
        colorScheme="dark"
        radius="xl"
        style={[
          { flexDirection: 'row', gap: 4, padding: 6 },
          nativeGlass
            ? null
            : { backgroundColor: theme.colors.playerGlassFill, borderColor: theme.colors.playerGlassStroke },
        ]}
        testID="player-options"
      >
        <PlayerOptionButton
          accessibilityLabel={repeatItem.accessibilityLabel}
          active={repeat !== null}
          icon={REPEAT_ICON}
          label={repeatItem.label}
          onPress={() => setOpenMenu('repeat')}
          testID="player-option-repeat"
        />
        <PlayerOptionButton
          accessibilityLabel={rangeLabel}
          disabled={activeVerseId === null}
          icon={RANGE_ICON}
          label={rangeLabel}
          onPress={() => setOpenMenu('range')}
          testID="player-option-range"
        />
        <PlayerOptionButton
          accessibilityLabel={t('player.options.speed', { rate: formatNumber(speed, locale) })}
          icon={SPEED_ICON}
          label={t('player.options.speed', { rate: formatNumber(speed, locale) })}
          onPress={() => setOpenMenu('speed')}
          testID="player-option-speed"
        />
        <PlayerOptionButton
          accessibilityLabel={sleepAccessibilityLabel}
          active={sleep.armed}
          icon={SLEEP_ICON}
          label={sleep.label}
          onPress={() => setOpenMenu('sleep')}
          testID="player-option-sleep"
        />
      </GlassSurface>
      {openMenu === 'repeat' ? <PlayerRepeatMenu onClose={() => setOpenMenu(null)} visible /> : null}
      {openMenu === 'range' ? <PlayerRangeMenu onClose={() => setOpenMenu(null)} visible /> : null}
      {openMenu === 'speed' ? <PlayerSpeedMenu onClose={() => setOpenMenu(null)} visible /> : null}
      {openMenu === 'sleep' ? <PlayerSleepMenu onClose={() => setOpenMenu(null)} visible /> : null}
    </>
  );
}

// A narrow translator for the label helpers: passing i18next's fully typed `t` makes TypeScript infer across ~700
// typed keys and hit its depth limit (TS2589).
type Translate = (key: string, options?: Record<string, unknown>) => string;

/** The first and last ayah numbers of the repeat range, or null when either ayah is not in the surah's verses. */
function rangeNumbers(verses: readonly SurahVerse[], repeat: RepeatRange): { from: number; to: number } | null {
  const from = verseNumberOf(verses, repeat.fromVerseId);
  const to = verseNumberOf(verses, repeat.toVerseId);
  return from === undefined || to === undefined ? null : { from, to };
}

/**
 * The repeat item's text. Off: the title. Set: «تكرار ٣×» (∞ as is), accented by the caller; the spoken label names
 * the count and the range shown beside it.
 */
function repeatLabels(
  repeat: RepeatRange | null,
  rangeLabel: string,
  t: Translate,
  locale: Locale,
): { accessibilityLabel: string; label: string } {
  if (repeat === null) {
    return { accessibilityLabel: t('player.options.repeatLabel'), label: t('player.options.repeat') };
  }
  const count = repeat.count;
  const countText = count === Infinity ? t('player.repeat.forever') : t('player.repeat.times', { count: formatNumber(count, locale) });
  const spokenCount =
    count === Infinity
      ? t('player.repeat.spokenForever')
      : count === 1
        ? t('player.repeat.spokenOnce')
        : t('player.repeat.spokenTimes', { count: formatNumber(count, locale) });
  return {
    accessibilityLabel: t('player.repeat.spoken', { count: spokenCount, range: rangeLabel }),
    label: t('player.repeat.label', { count: countText }),
  };
}

/** The sleep item's text: its default title, or the armed state with the minutes left. */
function sleepLabels(
  mode: SleepMode,
  remainingMinutes: number | null,
  t: Translate,
  locale: Locale,
): { armed: boolean; label: string; spoken: string } {
  if (mode === 'off') {
    return { armed: false, label: t('player.options.sleep'), spoken: '' };
  }
  if (mode === 'endOfSurah') {
    const state = t('player.sleep.endOfSurah');
    return { armed: true, label: state, spoken: state };
  }
  const minutes = formatNumber(remainingMinutes ?? 0, locale);
  return {
    armed: true,
    label: t('player.sleep.remaining', { minutes }),
    spoken: t('player.sleep.remainingLong', { minutes }),
  };
}
