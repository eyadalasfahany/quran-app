import * as Notifications from 'expo-notifications';

/**
 * How a reminder that arrives while the app is open is shown: a banner or heads-up pop-up, the list entry and the
 * channel's sound. Prayer, Azkar and daily-reading notifications share this. None of their payloads carries a
 * per-category silent flag, so nothing here is filtered. No badge: the app keeps no unread count.
 */
export const FOREGROUND_NOTIFICATION_BEHAVIOR: Notifications.NotificationBehavior = {
  shouldShowBanner: true,
  shouldShowList: true,
  shouldPlaySound: true,
  shouldSetBadge: false,
};

let installed = false;

/**
 * Tells the OS how to present a notification received in the foreground. Without a handler, expo-notifications drops
 * the notification silently while the app is open. Safe to call more than once: only the first call installs it.
 */
export function installForegroundNotificationHandler(): void {
  if (installed) {
    return;
  }
  installed = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ ...FOREGROUND_NOTIFICATION_BEHAVIOR }),
  });
}
