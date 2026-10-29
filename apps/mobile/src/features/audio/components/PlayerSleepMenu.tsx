import { useTranslation } from 'react-i18next';

import { formatNumber } from '@/core/i18n/numbers';
import { useLocale } from '@/core/i18n/useLocale';

import { usePlayerStore } from '../playerStore';
import { SLEEP_MINUTES, useSleepTimerStore, type SleepMode } from '../sleep-timer';
import { PlayerChoiceMenu, type PlayerChoice } from './PlayerChoiceMenu';


// The sleep timer choice from the options bar. Choosing an option arms it; Off cancels a timer that is running.
export function PlayerSleepMenu({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const mode = useSleepTimerStore((state) => state.mode);
  const choose = useSleepTimerStore((state) => state.choose);
  const hasSurah = usePlayerStore((state) => state.chapterId !== null);
  // End of ayah needs a recited ayah, which only a surah with timings has.
  const hasAyah = usePlayerStore((state) => state.activeVerseId !== null);
  const minutes = (value: number) => t('player.sleep.minutes', { minutes: formatNumber(value, locale) });
  const choices: PlayerChoice<SleepMode>[] = [
    { value: 'off', label: t('player.sleep.off') },
    { value: 'minutes15', label: minutes(SLEEP_MINUTES.minutes15) },
    { value: 'minutes30', label: minutes(SLEEP_MINUTES.minutes30) },
    { value: 'minutes60', label: minutes(SLEEP_MINUTES.minutes60) },
    { value: 'endOfSurah', label: t('player.sleep.endOfSurah'), disabled: !hasSurah },
    { value: 'endOfAyah', label: t('player.sleep.endOfAyah'), disabled: !hasAyah },
  ];

  return (
    <PlayerChoiceMenu
      choices={choices}
      onClose={onClose}
      onSelect={(value) => {
        choose(value);
        onClose();
      }}
      selected={mode}
      testID="player-sleep-menu"
      title={t('player.options.sleep')}
      visible={visible}
    />
  );
}
