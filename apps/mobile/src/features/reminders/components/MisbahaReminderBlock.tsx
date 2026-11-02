import { Fragment, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { formatTime, useLocale } from '@/core/i18n';
import { clockTrigger } from '@/features/azkar/reminders/schedule';
import { ensureReminderPermission } from '@/features/notifications/permission';

import { type MisbahaReminder, readMisbahaReminder, writeMisbahaReminder } from '../data/goal-settings';
import { resyncGoalReminders } from '../data/goal-sync';
import { misbahaStatus } from '../data/hub-status';
import { ReminderClockRow } from './ReminderClockRow';
import { ReminderPermissionDialog } from './ReminderPermissionDialog';
import { ReminderRow } from './ReminderRow';

/** A local date at the given time of day, for formatting a clock time. */
function timeOfDay(hour: number, minute: number): Date {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date;
}

/**
 * The misbaha daily target reminder in the hub (ADR 0034 §4). Its switch, and once it is on, the time the user picks: no
 * time is suggested, so the status asks for one until it is set. Turning it on asks for permission first.
 */
export function MisbahaReminderBlock({ granted, testID = 'reminder-misbaha' }: { granted: boolean | null; testID?: string }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const [settings, setSettings] = useState<MisbahaReminder>(readMisbahaReminder);
  const [denied, setDenied] = useState(false);

  const save = (next: MisbahaReminder) => {
    setSettings(next);
    writeMisbahaReminder(next);
    void resyncGoalReminders();
  };

  const handleToggle = (on: boolean) => {
    if (!on) {
      save({ ...settings, enabled: false });
      return;
    }
    void ensureReminderPermission().then((allowed) => {
      if (allowed) {
        save({ ...settings, enabled: true });
      } else {
        setDenied(true);
      }
    });
  };

  const clock = clockTrigger(settings.clockTime);
  const detail =
    clock === null ? undefined : t('reminders.misbaha.everyDay', { time: formatTime(timeOfDay(clock.hour, clock.minute), locale) });

  return (
    <Fragment>
      <ReminderRow
        detail={detail}
        onValueChange={handleToggle}
        status={misbahaStatus(settings, { granted })}
        testID={testID}
        title={t('reminders.misbaha.title')}
        value={settings.enabled}
      />
      {settings.enabled ? (
        <ReminderClockRow
          clockTime={settings.clockTime}
          label={t('reminders.clock.label')}
          onChange={(clockTime) => save({ ...settings, clockTime })}
          testID={`${testID}-time`}
        />
      ) : null}
      <ReminderPermissionDialog onClose={() => setDenied(false)} visible={denied} />
    </Fragment>
  );
}
