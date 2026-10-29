import { useTranslation } from 'react-i18next';

import { formatNumber } from '@/core/i18n/numbers';
import { useLocale } from '@/core/i18n/useLocale';

import { usePlayerStore } from '../playerStore';
import { PlayerChoiceMenu, type PlayerChoice } from './PlayerChoiceMenu';

export const SPEED_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;

// The speed choice from the options bar. Choosing a rate sets it on the store; the engine applies it to the playlist.
export function PlayerSpeedMenu({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const speed = usePlayerStore((state) => state.speed);
  const setSpeed = usePlayerStore((state) => state.setSpeed);
  const choices: PlayerChoice<number>[] = SPEED_RATES.map((rate) => ({
    value: rate,
    label: t('player.options.rateValue', { rate: formatNumber(rate, locale) }),
  }));

  return (
    <PlayerChoiceMenu
      choices={choices}
      onClose={onClose}
      onSelect={(rate) => {
        setSpeed(rate);
        onClose();
      }}
      selected={speed}
      testID="player-speed-menu"
      title={t('player.options.speedTitle')}
      visible={visible}
    />
  );
}
