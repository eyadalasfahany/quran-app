import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { Locale } from '@/core/i18n/locale';
import { formatNumber } from '@/core/i18n/numbers';
import { useLocale } from '@/core/i18n/useLocale';
import { useGlass, useTheme } from '@/core/theme';
import { GlassSurface } from '@/shared/ui/GlassSurface';

import { usePlayerStore } from '../playerStore';
import { selectRemainingMinutes, useSleepTimerStore, type SleepMode } from '../sleep-timer';
import { RANGE_ICON, REPEAT_ICON, SLEEP_ICON, SPEED_ICON } from './player-icons';
import { PlayerOptionButton } from './PlayerOptionButton';
import { PlayerSleepMenu } from './PlayerSleepMenu';
import { PlayerSpeedMenu } from './PlayerSpeedMenu';

type OpenMenu = 'speed' | 'sleep' | null;

// The bottom glass group: repeat, the ayah range, speed and the sleep timer. Repeat and the range stay disabled
// until step 5b. Speed and the sleep timer open their menus; a running sleep timer shows its remaining minutes
// and takes the accent. Glass is the native material when it is on; otherwise the bar takes the frame's player
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
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  // With no surah loaded there is no range to show.
  const rangeLabel =
    versesCount > 0
      ? t('player.options.range', { from: formatNumber(1, locale), to: formatNumber(versesCount, locale) })
      : t('player.options.rangeEmpty');
  const sleepTitle = t('player.options.sleep');
  const sleep = sleepLabels(sleepMode, remainingMinutes, t, locale);
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
          accessibilityLabel={t('player.options.repeatLabel')}
          disabled
          icon={REPEAT_ICON}
          label={t('player.options.repeat')}
          onPress={() => undefined}
          testID="player-option-repeat"
        />
        <PlayerOptionButton
          accessibilityLabel={rangeLabel}
          disabled
          icon={RANGE_ICON}
          label={rangeLabel}
          onPress={() => undefined}
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
      {openMenu === 'speed' ? <PlayerSpeedMenu onClose={() => setOpenMenu(null)} visible /> : null}
      {openMenu === 'sleep' ? <PlayerSleepMenu onClose={() => setOpenMenu(null)} visible /> : null}
    </>
  );
}

type Translate = ReturnType<typeof useTranslation>['t'];

/** The sleep item's text: its default title, or the armed state with the minutes left. */
function sleepLabels(mode: SleepMode, remainingMinutes: number | null, t: Translate, locale: Locale) {
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
