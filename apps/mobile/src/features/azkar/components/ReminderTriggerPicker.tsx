import { useTranslation } from 'react-i18next';

import { SegmentedControl, type SegmentedOption } from '@/shared/ui';

import type { ReminderTriggerType } from '../reminders/reminders-repository';

/** Chooses how a reminder is timed: at a clock time the user picks, or relative to a prayer (ADR 0031 §7). */
export function ReminderTriggerPicker({
  value,
  onChange,
  testID = 'azkar-reminder-trigger',
}: {
  value: ReminderTriggerType;
  onChange: (value: ReminderTriggerType) => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const options: SegmentedOption<ReminderTriggerType>[] = [
    { key: 'clock', label: t('azkar.reminders.trigger.clock') },
    { key: 'prayer_relative', label: t('azkar.reminders.trigger.prayer') },
  ];

  return (
    <SegmentedControl
      label={t('azkar.reminders.trigger.label')}
      onChange={onChange}
      options={options}
      testID={testID}
      value={value}
    />
  );
}
