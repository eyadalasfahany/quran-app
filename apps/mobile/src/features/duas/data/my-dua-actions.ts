import * as Notifications from 'expo-notifications';

import { getReminder } from '@/features/azkar/reminders/reminders-repository';
import { resyncAzkarReminders } from '@/features/azkar/reminders/resync';

import { deleteMyDua, updateMyDua, type MyDuaInput } from './my-duas-repository';

/**
 * Cancels the given notification ids. Each cancel is independent: one failure is logged and the rest still run, and
 * nothing is thrown into the caller.
 */
async function cancelNotifications(ids: readonly string[]): Promise<void> {
  await Promise.all(
    ids.map((id) =>
      Notifications.cancelScheduledNotificationAsync(id).catch((error: unknown) => {
        console.error(error);
      }),
    ),
  );
}

/** Re-plans the Azkar reminders in the background. Errors are logged, never thrown into the UI. */
function resyncInBackground(): void {
  void resyncAzkarReminders().catch((error: unknown) => {
    console.error(error);
  });
}

/**
 * Deletes a dua and its reminder. The reminder's notification ids are read before the delete, because the delete removes
 * the reminder row. The delete happens at once; cancelling the notifications and re-planning run in the background. A
 * dua with no reminder cancels nothing and re-plans nothing.
 */
export function removeMyDua(id: string): void {
  const reminder = getReminder('my_dua', id);
  deleteMyDua(id);
  if (reminder === null) {
    return;
  }
  void cancelNotifications(reminder.notificationIds).then(resyncInBackground);
}

/**
 * Saves an edit to a dua. A reminder for it is re-planned in the background; a dua with no reminder re-plans nothing.
 */
export function editMyDua(id: string, input: MyDuaInput): void {
  updateMyDua(id, input);
  if (getReminder('my_dua', id) === null) {
    return;
  }
  resyncInBackground();
}
