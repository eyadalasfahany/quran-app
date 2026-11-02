import * as Notifications from 'expo-notifications';
import { router, type Href } from 'expo-router';

/**
 * The routes a reminder may open (spec §13, ADR 0031 §7, ADR 0030 §3). Anything else in a payload is ignored rather than
 * navigated to. A trailing slash marks a prefix: `/read/` is the daily Quran reminder and `/azkar/` an Azkar reminder.
 * `/salah` is the prayer-time notification, `/sibha` the misbaha target and `/reminders` the test notification. These match exactly, so `/salahx` is still ignored.
 */
export const REMINDER_ROUTE_PREFIXES = ['/read/', '/azkar/', '/salah', '/sibha', '/reminders'] as const;

export function isReminderRoute(route: unknown): route is string {
  return (
    typeof route === 'string' &&
    REMINDER_ROUTE_PREFIXES.some((prefix) => (prefix.endsWith('/') ? route.startsWith(prefix) : route === prefix))
  );
}

function readRoute(response: Notifications.NotificationResponse | null): Href | null {
  const route = response?.notification.request.content.data?.route;
  return isReminderRoute(route) ? (route as Href) : null;
}

// A cold-start tap is delivered twice: once to the response listener and once through
// getLastNotificationResponseAsync. Swallow the duplicate, but not a later tap on the same
// repeating notification.
let lastHandled: { identifier: string; at: number } | null = null;

function openRoute(response: Notifications.NotificationResponse | null): void {
  if (response === null) {
    return;
  }
  const route = readRoute(response);
  const identifier = response.notification.request.identifier;
  if (
    route === null ||
    (lastHandled !== null &&
      lastHandled.identifier === identifier &&
      Math.abs(Date.now() - lastHandled.at) < 2000)
  ) {
    return;
  }
  lastHandled = { identifier, at: Date.now() };
  router.navigate(route);
}

// The listener is kept so it can be removed. Registering twice would open every tap twice.
let subscription: { remove: () => void } | null = null;

/**
 * A tap on the reminder opens the reading position or Azkar screen it pointed at (spec §13), including cold start.
 * Idempotent: a second call while registered does nothing.
 */
export function registerReminderDeepLinks(): void {
  if (subscription !== null) {
    return;
  }
  subscription = Notifications.addNotificationResponseReceivedListener(openRoute) ?? { remove: () => undefined };
  void Notifications.getLastNotificationResponseAsync().then(openRoute);
}

/** Removes the tap listener, so the next `registerReminderDeepLinks` adds exactly one. */
export function unregisterReminderDeepLinks(): void {
  subscription?.remove();
  subscription = null;
}
