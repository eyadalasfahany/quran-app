import { useTranslation } from 'react-i18next';

import { IconButton, type IconName, ToggleRow } from '@/shared/ui';

const BELL: IconName = { ios: 'bell', android: 'notifications' };

/**
 * An Azkar session goal (screens/, #DailyGoalsSheet): the switch that tracks the session for the day, and
 * a bell that opens that session's reminder sheet. The bell is labelled «تذكير» with the session's name.
 */
export function GoalRowWithBell({
  title,
  value,
  onValueChange,
  onBellPress,
  testID,
}: {
  title: string;
  value: boolean;
  onValueChange: (on: boolean) => void;
  onBellPress: () => void;
  testID: string;
}) {
  const { t } = useTranslation();

  return (
    <ToggleRow
      accessory={
        <IconButton
          icon={BELL}
          label={t('dailyGoals.bell', { name: title })}
          onPress={onBellPress}
          testID={`${testID}-bell`}
          tone="muted"
        />
      }
      onValueChange={onValueChange}
      testID={testID}
      title={title}
      value={value}
    />
  );
}
