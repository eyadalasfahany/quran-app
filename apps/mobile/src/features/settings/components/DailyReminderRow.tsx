import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Linking } from 'react-native';

import { formatTime, useLocale } from '@/core/i18n';
import { storage, storageKeys } from '@/core/storage/mmkv';
import {
  ensureReminderPermission,
  readReminderTime,
  syncDailyReminder,
} from '@/features/notifications/reminder-service';
import { ToggleRow } from '@/shared/ui/ToggleRow';

import { ReminderTimeSheet } from './ReminderTimeSheet';

function storedTimeAsDate(): Date {
  const { hour, minute } = readReminderTime();
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date;
}

function storeTime(date: Date): void {
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  storage.set(storageKeys.dailyReminderTime, `${hour}:${minute}`);
}

/**
 * The daily reminder row in Settings (spec §13): a switch, the chosen time as subtitle, and a tap
 * on the row (when on) opens the time picker. Permission is asked only when turning on.
 */
export function DailyReminderRow() {
  const { t } = useTranslation();
  const locale = useLocale();
  // All writes happen in this row, so local state stays truthful; a remount re-reads MMKV.
  const [enabled, setEnabled] = useState(() => storage.getBoolean(storageKeys.dailyReminder) === true);
  const [time, setTime] = useState(storedTimeAsDate);
  const [pickerOpen, setPickerOpen] = useState(false);

  const apply = (on: boolean) => {
    setEnabled(on);
    storage.set(storageKeys.dailyReminder, on);
    void syncDailyReminder();
  };

  const handleToggle = (on: boolean) => {
    if (!on) {
      apply(false);
      return;
    }
    void ensureReminderPermission().then((granted) => {
      if (granted) {
        apply(true);
        return;
      }
      Alert.alert(
        t('settings.reminders.permissionDeniedTitle'),
        t('settings.reminders.permissionDeniedBody'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('common.openSettings'), onPress: () => void Linking.openSettings() },
        ],
      );
    });
  };

  const handleTimePicked = (date: Date) => {
    setTime(date);
    storeTime(date);
    setPickerOpen(false);
    void syncDailyReminder();
  };

  return (
    <>
      <ToggleRow
        onPress={enabled ? () => setPickerOpen(true) : undefined}
        onValueChange={handleToggle}
        subtitle={enabled ? t('settings.reminders.everyDayAt', { time: formatTime(time, locale) }) : undefined}
        testID="daily-reminder-toggle"
        title={t('settings.reminders.dailyReminder')}
        value={enabled}
      />
      {pickerOpen ? (
        <ReminderTimeSheet
          onClose={() => setPickerOpen(false)}
          onPick={handleTimePicked}
          testID="daily-reminder-picker"
          value={time}
        />
      ) : null}
    </>
  );
}
