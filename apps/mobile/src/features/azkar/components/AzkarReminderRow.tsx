import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, View } from 'react-native';

import { formatTime, useLocale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { ReminderTimeSheet } from '@/features/settings/components/ReminderTimeSheet';
import { ensureReminderPermission } from '@/features/notifications/reminder-service';
import { ConfirmDialog, ListRow, ToggleRow, UiText } from '@/shared/ui';

import { canScheduleAzkarReminder } from '../reminders/budget-plan';
import { useAzkarReminder, useHasReminderLocation } from '../reminders/hooks';
import {
  saveReminder,
  type AzkarReminderInput,
  type ReminderTargetType,
  type ReminderTriggerType,
} from '../reminders/reminders-repository';
import { resyncAzkarReminders } from '../reminders/resync';
import { clockTrigger, formatClockTime, type ReminderPrayer } from '../reminders/schedule';
import { PrayerOffsetPicker } from './PrayerOffsetPicker';
import { ReminderTriggerPicker } from './ReminderTriggerPicker';

const SALAH_HREF = '/salah' as Href;

/**
 * Where the time picker starts: the saved time, or the current time when none is chosen. It is the picker's starting
 * point only; nothing is chosen for the user.
 */
function pickerStart(clockTime: string | null): Date {
  const date = new Date();
  const parsed = clockTrigger(clockTime);
  if (parsed !== null) {
    date.setHours(parsed.hour, parsed.minute, 0, 0);
  } else {
    date.setSeconds(0, 0);
  }
  return date;
}

/** Which notice the row shows: the pool is full (`limit`), or permission was refused (`denied`). */
type RowNotice = { kind: 'limit' | 'denied'; open: boolean };

/**
 * One reminder in the Azkar sheet: the switch, and while it is on, its trigger (a clock time or a prayer offset).
 * Nothing is on by default and no time is recommended (ADR 0031 §7). Turning on asks for notification permission; when
 * it is refused the switch stays off and a shared ConfirmDialog offers the Settings app, as the daily reminder does. When
 * the pending-notification pool is full, a change that would need a slot is refused with a notice and nothing is
 * written, so the switch reverts.
 */
export function AzkarReminderRow({
  targetType,
  targetKey,
  title,
  onPermissionDenied,
  testID = 'azkar-reminder-row',
}: {
  targetType: ReminderTargetType;
  targetKey: string;
  /** The switch's label; defaults to «تنبيه يومي». */
  title?: string;
  /** Called after a refused permission, so the sheet can show its notice. */
  onPermissionDenied?: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const reminder = useAzkarReminder(targetType, targetKey);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [notice, setNotice] = useState<RowNotice>({ kind: 'limit', open: false });

  const enabled = reminder?.enabled ?? false;
  const triggerType: ReminderTriggerType = reminder?.triggerType ?? 'clock';
  const clockTime = reminder?.clockTime ?? null;
  const hasLocation = useHasReminderLocation(enabled && triggerType === 'prayer_relative');

  /** The whole choice as it would be saved, with the given change applied. */
  const inputWith = (change: Partial<AzkarReminderInput>): AzkarReminderInput => ({
    targetType,
    targetKey,
    enabled,
    triggerType,
    clockTime,
    prayer: reminder?.prayer ?? null,
    offsetMinutes: reminder?.offsetMinutes ?? null,
    ...change,
  });

  const limitReached = () => {
    setNotice({ kind: 'limit', open: true });
  };

  // Every edit writes the whole choice, then re-plans the notifications. The live query re-renders the row.
  // An edit that would need a pending slot the pool does not have is refused before anything is written.
  const save = (change: Partial<AzkarReminderInput>) => {
    const next = inputWith(change);
    if (!canScheduleAzkarReminder(next)) {
      limitReached();
      return;
    }
    saveReminder(next);
    void resyncAzkarReminders();
  };

  const handleToggle = (on: boolean) => {
    if (!on) {
      save({ enabled: false });
      return;
    }
    if (!canScheduleAzkarReminder(inputWith({ enabled: true }))) {
      limitReached();
      return;
    }
    void ensureReminderPermission().then((granted) => {
      if (granted) {
        save({ enabled: true });
        return;
      }
      // Refused: nothing was written, so the switch reverts to off. Same notice as the daily reminder.
      onPermissionDenied?.();
      setNotice({ kind: 'denied', open: true });
    });
  };

  const closeNotice = () => {
    setNotice((current) => ({ ...current, open: false }));
  };

  const handleTrigger = (next: ReminderTriggerType) => {
    if (next === 'clock') {
      save({ triggerType: 'clock' });
      return;
    }
    save({ triggerType: 'prayer_relative', offsetMinutes: reminder?.offsetMinutes ?? 0 });
  };

  const handleTimePicked = (date: Date) => {
    save({ clockTime: formatClockTime(date.getHours(), date.getMinutes()) });
    setPickerOpen(false);
  };

  const handlePrayer = (prayer: ReminderPrayer) => {
    save({ prayer, offsetMinutes: reminder?.offsetMinutes ?? 0 });
  };

  const denied = notice.kind === 'denied';

  return (
    <>
      <View>
        <ToggleRow onValueChange={handleToggle} testID={testID} title={title ?? t('azkar.reminders.dailyAlert')} value={enabled} />
        {enabled ? (
          <View style={{ gap: theme.space[3], paddingBottom: theme.space[3], paddingHorizontal: theme.space[4] }}>
            <ReminderTriggerPicker onChange={handleTrigger} testID={`${testID}-trigger`} value={triggerType} />

            {triggerType === 'clock' ? (
              <>
                <ListRow
                  onPress={() => setPickerOpen(true)}
                  testID={`${testID}-time`}
                  title={t('azkar.reminders.time')}
                  trailing={
                    <UiText tone={clockTime === null ? 'brand' : 'ink'} variant="subhead" weight={600}>
                      {clockTime === null ? t('azkar.reminders.chooseTime') : formatTime(pickerStart(clockTime), locale)}
                    </UiText>
                  }
                />
                {pickerOpen ? (
                  <ReminderTimeSheet
                    onClose={() => setPickerOpen(false)}
                    onPick={handleTimePicked}
                    testID={`${testID}-picker`}
                    value={pickerStart(clockTime)}
                  />
                ) : null}
              </>
            ) : (
              <PrayerOffsetPicker
                needsLocation={hasLocation === false}
                offsetMinutes={reminder?.offsetMinutes ?? null}
                onOffsetChange={(minutes) => save({ offsetMinutes: minutes })}
                onOpenLocation={() => router.push(SALAH_HREF)}
                onPrayerChange={handlePrayer}
                prayer={reminder?.prayer ?? null}
                testID={`${testID}-prayer`}
              />
            )}
          </View>
        ) : null}
      </View>
      {denied ? (
        <ConfirmDialog
          cancelLabel={t('common.cancel')}
          confirmLabel={t('common.openSettings')}
          message={t('settings.reminders.permissionDeniedBody')}
          onCancel={closeNotice}
          onConfirm={() => {
            closeNotice();
            void Linking.openSettings();
          }}
          testID={`${testID}-denied`}
          title={t('settings.reminders.permissionDeniedTitle')}
          visible={notice.open}
        />
      ) : (
        <ConfirmDialog
          confirmLabel={t('common.done')}
          onCancel={closeNotice}
          onConfirm={closeNotice}
          testID={`${testID}-limit`}
          title={t('azkar.reminders.limitReached')}
          visible={notice.open}
        />
      )}
    </>
  );
}
