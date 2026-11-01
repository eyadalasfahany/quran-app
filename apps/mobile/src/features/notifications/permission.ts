import * as Notifications from 'expo-notifications';

/**
 * Asks the system for notification permission, only when the user turns a reminder on (spec §13). Resolves to whether
 * notifications are allowed. Lives apart from the daily reminder service so the Salah data layer can use it without
 * loading the khatma and reader modules.
 */
export async function ensureReminderPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) {
    return true;
  }
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}
