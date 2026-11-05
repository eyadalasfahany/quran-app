import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Asks the system for notification permission, only when the user turns a reminder on, or when location approval arms the default prayer bells (spec §13, ADR 0064). Resolves to whether
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

/**
 * Whether exact alarms are denied, so prayer notifications would arrive inexactly. Android 14+ denies
 * `SCHEDULE_EXACT_ALARM` by default. Always false off Android; a failed read counts as not needed.
 */
export async function needsExactAlarmAccess(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return false;
  }
  try {
    const response = await Notifications.getExactAlarmPermissionsAsync();
    return !response.granted;
  } catch {
    return false;
  }
}

/**
 * Opens the system exact-alarm screen and resolves to whether access is now granted. A failure (for example the app
 * does not declare the permission) resolves to false, so the bell keeps working with inexact notifications.
 */
export async function requestExactAlarmAccess(): Promise<boolean> {
  try {
    const response = await Notifications.requestExactAlarmPermissionsAsync();
    return response.granted;
  } catch {
    return false;
  }
}
