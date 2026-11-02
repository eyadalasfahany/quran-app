import { useTranslation } from 'react-i18next';

import { GlassSurface } from '@/shared/ui/GlassSurface';
import { REPEAT_ICON, SLEEP_ICON, SPEED_ICON } from '@/features/audio/components/player-icons';

import { AzkarPlayerOptionButton } from './AzkarPlayerOptionButton';

/**
 * The options bar under the full player's controls: repeat mode, speed and the sleep timer (ADR 0031 §8). Each option
 * opens its choices in the sheet. The labels show the current value, so the state reads without opening them.
 */
export function AzkarPlayerOptionsBar({
  repeatLabel,
  speedLabel,
  sleepLabel,
  sleepArmed,
  repeatOpen = false,
  speedOpen = false,
  sleepOpen = false,
  onRepeat,
  onSpeed,
  onSleep,
  testID = 'azkar-player-options',
}: {
  /** The mode's name, such as «حسب العدد». */
  repeatLabel: string;
  /** The speed, such as «١×». */
  speedLabel: string;
  /** The sleep timer's state, such as «مؤقت النوم» or «١٥ د». */
  sleepLabel: string;
  /** Whether a sleep timer is running or armed (accent and label). */
  sleepArmed: boolean;
  repeatOpen?: boolean;
  speedOpen?: boolean;
  sleepOpen?: boolean;
  onRepeat: () => void;
  onSpeed: () => void;
  onSleep: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();

  return (
    <GlassSurface radius="xl" style={{ flexDirection: 'row', gap: 4, padding: 6 }} testID={testID}>
      <AzkarPlayerOptionButton
        accessibilityLabel={t('azkar.player.repeat.option')}
        active={repeatOpen}
        icon={REPEAT_ICON}
        label={repeatLabel}
        onPress={onRepeat}
        testID={`${testID}-repeat`}
      />
      <AzkarPlayerOptionButton
        accessibilityLabel={speedLabel}
        active={speedOpen}
        icon={SPEED_ICON}
        label={speedLabel}
        onPress={onSpeed}
        testID={`${testID}-speed`}
      />
      <AzkarPlayerOptionButton
        accessibilityLabel={t('player.options.sleep')}
        active={sleepArmed || sleepOpen}
        icon={SLEEP_ICON}
        label={sleepLabel}
        onPress={onSleep}
        testID={`${testID}-sleep`}
      />
    </GlassSurface>
  );
}
