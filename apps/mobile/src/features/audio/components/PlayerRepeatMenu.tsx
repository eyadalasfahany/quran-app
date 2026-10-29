import { useTranslation } from 'react-i18next';

import { formatNumber } from '@/core/i18n/numbers';
import { useLocale } from '@/core/i18n/useLocale';

import { REPEAT_COUNTS } from '../repeat';
import { setRepeat } from '../player';
import { usePlayerStore } from '../playerStore';
import { PlayerChoiceMenu, type PlayerChoice } from './PlayerChoiceMenu';

export type RepeatChoice = 'off' | number;

// The repeat choice from the options bar. Choosing a count repeats the ayah range set in the store, or the recited
// ayah when no range is set; «إيقاف» clears the repeat. Choices need a recited ayah (the timings to repeat), except
// «إيقاف», which stays available while a repeat is set so it can always be cleared.
export function PlayerRepeatMenu({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const repeat = usePlayerStore((state) => state.repeat);
  const activeVerseId = usePlayerStore((state) => state.activeVerseId);
  const hasAyah = activeVerseId !== null;
  const countLabel = (count: number) => {
    if (count === Infinity) {
      return t('player.repeat.forever');
    }
    if (count === 1) {
      return t('player.repeat.once');
    }
    return t('player.repeat.times', { count: formatNumber(count, locale) });
  };
  const choices: PlayerChoice<RepeatChoice>[] = [
    { value: 'off', label: t('player.repeat.off'), disabled: !hasAyah && repeat === null },
    ...REPEAT_COUNTS.map((count) => ({ value: count, label: countLabel(count), disabled: !hasAyah })),
  ];

  return (
    <PlayerChoiceMenu<RepeatChoice>
      choices={choices}
      onClose={onClose}
      onSelect={(value) => {
        if (value === 'off') {
          usePlayerStore.getState().clearRepeat();
          return;
        }
        // The range set in the store, or the recited ayah alone. The engine refuses a range its timings lack, and
        // then nothing changes.
        const from = repeat?.fromVerseId ?? activeVerseId;
        const to = repeat?.toVerseId ?? activeVerseId;
        if (from !== null && to !== null) {
          setRepeat({ fromVerseId: from, toVerseId: to, count: value });
        }
      }}
      selected={repeat === null ? 'off' : repeat.count}
      testID="player-repeat-menu"
      title={t('player.repeat.title')}
      visible={visible}
    />
  );
}
