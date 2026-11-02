import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { formatTime, useLocale } from '@/core/i18n';
import { clockTrigger, formatClockTime } from '@/features/azkar/reminders/schedule';
import { ReminderTimeSheet } from '@/features/settings/components/ReminderTimeSheet';
import { ListRow, UiText } from '@/shared/ui';

/**
 * A reminder's clock time as a row: the label, and the chosen time on the end side (or «اختر وقتًا» until one is picked).
 * Pressing it opens the time picker. No time is suggested: the picker starts at the saved time, or now when there is none.
 */
export function ReminderClockRow({
  label,
  clockTime,
  onChange,
  testID,
}: {
  label: string;
  /** `HH:mm`, or null when no time is chosen yet. */
  clockTime: string | null;
  onChange: (clockTime: string) => void;
  testID: string;
}) {
  const { t } = useTranslation();
  const locale = useLocale();
  const [pickerOpen, setPickerOpen] = useState(false);

  const parsed = clockTrigger(clockTime);
  const start = new Date();
  start.setSeconds(0, 0);
  if (parsed !== null) {
    start.setHours(parsed.hour, parsed.minute, 0, 0);
  }

  return (
    <>
      <ListRow
        onPress={() => setPickerOpen(true)}
        testID={testID}
        title={label}
        trailing={
          <UiText tone={clockTime === null ? 'brand' : 'ink'} variant="subhead" weight={600}>
            {clockTime === null ? t('reminders.clock.choose') : formatTime(start, locale)}
          </UiText>
        }
      />
      {pickerOpen ? (
        <ReminderTimeSheet
          onClose={() => setPickerOpen(false)}
          onPick={(date) => {
            onChange(formatClockTime(date.getHours(), date.getMinutes()));
            setPickerOpen(false);
          }}
          testID={`${testID}-picker`}
          value={start}
        />
      ) : null}
    </>
  );
}
