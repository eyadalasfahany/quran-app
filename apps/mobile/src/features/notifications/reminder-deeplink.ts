import * as Notifications from 'expo-notifications';
import { router, type Href } from 'expo-router';

// The daily reminder is the app's only local notification; its payload carries a /read route.
// Anything else is ignored rather than navigated to.
function readRoute(response: Notifications.NotificationResponse | null): Href | null {
  const route = response?.notification.request.content.data?.route;
  return typeof route === 'string' && route.startsWith('/read/') ? (route as Href) : null;
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

/** A tap on the reminder opens the reading position it pointed at (spec §13), including cold start. */
export function registerReminderDeepLinks(): void {
  Notifications.addNotificationResponseReceivedListener(openRoute);
  void Notifications.getLastNotificationResponseAsync().then(openRoute);
}
