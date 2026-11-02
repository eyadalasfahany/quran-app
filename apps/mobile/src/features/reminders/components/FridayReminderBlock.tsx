import { Fragment, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { formatTime, useLocale } from '@/core/i18n';
import { useHasReminderLocation } from '@/features/azkar/reminders/hooks';
import { clockTrigger } from '@/features/azkar/reminders/schedule';
import { ensureReminderPermission } from '@/features/notifications/permission';
import { SegmentedControl, UiText } from '@/shared/ui';
import { useTheme } from '@/core/theme';

import { type FridayMode, type FridayReminder, readFridayReminder, writeFridayReminder } from '../data/goal-settings';
import { resyncGoalReminders } from '../data/goal-sync';
import { fridayStatus } from '../data/hub-status';
import { ReminderClockRow } from './ReminderClockRow';
import { ReminderPermissionDialog } from './ReminderPermissionDialog';
import { ReminderRow } from './ReminderRow';

const MODES: readonly { key: FridayMode; labelKey: 'reminders.friday.modeDhuhr' | 'reminders.friday.modeClock' }[] = [
  { key: 'dhuhr', labelKey: 'reminders.friday.modeDhuhr' },
  { key: 'clock', labelKey: 'reminders.friday.modeClock' },
];

/** A local date at the given time of day, for formatting a clock time. */
function timeOfDay(hour: number, minute: number): Date {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date;
}

/**
 * The Friday Surat al-Kahf reminder in the hub (ADR 0034). Its switch; when on, a choice between the Dhuhr time of the Friday
 * (from the location) and a time the user picks. Turning it on asks for permission first; a refusal keeps it off.
 */
export function FridayReminderBlock({ granted, testID = 'reminder-friday' }: { granted: boolean | null; testID?: string }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const theme = useTheme();
  const [settings, setSettings] = useState<FridayReminder>(readFridayReminder);
  const [denied, setDenied] = useState(false);
  const hasLocation = useHasReminderLocation(settings.enabled && settings.mode === 'dhuhr');

  const save = (next: FridayReminder) => {
    setSettings(next);
    writeFridayReminder(next);
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

  const clock = settings.mode === 'clock' ? clockTrigger(settings.clockTime) : null;
  const detail =
    settings.mode === 'dhuhr'
      ? t('reminders.friday.dhuhrSubtitle')
      : clock === null
        ? undefined
        : t('reminders.friday.everyFriday', { time: formatTime(timeOfDay(clock.hour, clock.minute), locale) });

  return (
    <Fragment>
      <ReminderRow
        detail={detail}
        onValueChange={handleToggle}
        status={fridayStatus(settings, { granted, hasLocation })}
        testID={testID}
        title={t('reminders.friday.title')}
        value={settings.enabled}
      />
      {settings.enabled ? (
        <View style={{ gap: theme.space[2] }}>
          <SegmentedControl
            label={t('reminders.friday.title')}
            onChange={(mode: FridayMode) => save({ ...settings, mode })}
            options={MODES.map((option) => ({ key: option.key, label: t(option.labelKey) }))}
            testID={`${testID}-mode`}
            value={settings.mode}
          />
          {settings.mode === 'dhuhr' && hasLocation === false ? (
            <UiText tone="muted" variant="caption">
              {t('reminders.friday.needsLocation')}
            </UiText>
          ) : null}
          {settings.mode === 'clock' ? (
            <ReminderClockRow
              clockTime={settings.clockTime}
              label={t('reminders.clock.label')}
              onChange={(clockTime) => save({ ...settings, clockTime })}
              testID={`${testID}-time`}
            />
          ) : null}
        </View>
      ) : null}
      <ReminderPermissionDialog onClose={() => setDenied(false)} visible={denied} />
    </Fragment>
  );
}
