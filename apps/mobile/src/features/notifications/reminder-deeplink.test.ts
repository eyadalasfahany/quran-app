import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';

import { isReminderRoute, registerReminderDeepLinks, unregisterReminderDeepLinks } from './reminder-deeplink';

jest.mock('expo-router', () => ({
  router: { navigate: jest.fn() },
}));

function response(identifier: string, route: unknown) {
  return {
    notification: {
      request: {
        identifier,
        content: { data: { route } },
      },
    },
  } as unknown as Notifications.NotificationResponse;
}

function tapListener() {
  const listener = jest.mocked(Notifications.addNotificationResponseReceivedListener).mock.calls[0]?.[0];
  expect(listener).toBeDefined();
  return listener as (r: Notifications.NotificationResponse) => void;
}

describe('registerReminderDeepLinks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Registration is idempotent, so each test starts unregistered.
  afterEach(() => {
    unregisterReminderDeepLinks();
  });

  it('adds one tap listener however many times it is called', () => {
    registerReminderDeepLinks();
    registerReminderDeepLinks();
    registerReminderDeepLinks();

    expect(Notifications.addNotificationResponseReceivedListener).toHaveBeenCalledTimes(1);
    expect(Notifications.getLastNotificationResponseAsync).toHaveBeenCalledTimes(1);
  });

  it('opens each tap once after repeated registration', () => {
    registerReminderDeepLinks();
    registerReminderDeepLinks();

    tapListener()(response('reminder-once', '/read/2:255'));

    expect(router.navigate).toHaveBeenCalledTimes(1);
  });

  it('removes the tap listener on unregister, so a later registration adds exactly one again', () => {
    const remove = jest.fn();
    jest.mocked(Notifications.addNotificationResponseReceivedListener).mockReturnValueOnce({ remove } as never);

    registerReminderDeepLinks();
    unregisterReminderDeepLinks();
    expect(remove).toHaveBeenCalledTimes(1);

    registerReminderDeepLinks();
    expect(Notifications.addNotificationResponseReceivedListener).toHaveBeenCalledTimes(2);
  });

  it('navigates to the reading position carried by the tapped reminder', () => {
    registerReminderDeepLinks();

    tapListener()(response('reminder-1', '/read/2:255'));

    expect(router.navigate).toHaveBeenCalledWith('/read/2:255');
  });

  it.each(['/settings', 'not-a-route', 42, undefined, '/azkarx', '/salahx', 'azkar/category/morning'])(
    'ignores the payload route %s',
    (route) => {
      registerReminderDeepLinks();

      tapListener()(response('reminder-1', route));

      expect(router.navigate).not.toHaveBeenCalled();
    },
  );

  it.each(['/azkar/category/morning', '/azkar/entry/hisn-al-muslim%3Aentry-000075'])(
    'opens the Azkar reminder route %s',
    (route) => {
      registerReminderDeepLinks();

      // A distinct identifier per tap: the cold-start de-duplication is keyed by it.
      tapListener()(response(`azkar-${route}`, route));

      expect(router.navigate).toHaveBeenCalledWith(route);
    },
  );

  it('opens the prayer notification route /salah, the الصلاة screen', () => {
    registerReminderDeepLinks();

    tapListener()(response('prayer-1', '/salah'));

    expect(router.navigate).toHaveBeenCalledWith('/salah');
  });

  it('recognises only the allowed prefixes', () => {
    expect(isReminderRoute('/salah')).toBe(true);
    expect(isReminderRoute('/salah/qibla')).toBe(false);
    expect(isReminderRoute('/salahx')).toBe(false);
    expect(isReminderRoute('/read/2:255')).toBe(true);
    expect(isReminderRoute('/azkar/category/morning')).toBe(true);
    expect(isReminderRoute('/sibha')).toBe(true);
    expect(isReminderRoute('/reminders')).toBe(true);
    expect(isReminderRoute('/sibhax')).toBe(false);
    expect(isReminderRoute(null)).toBe(false);
  });

  it('swallows the cold-start duplicate of a tap, but not a later tap', () => {
    jest.useFakeTimers().setSystemTime(1_000);
    try {
      registerReminderDeepLinks();
      const listener = tapListener();

      listener(response('reminder-1', '/read/2:255'));
      listener(response('reminder-1', '/read/2:255'));
      expect(router.navigate).toHaveBeenCalledTimes(1);

      jest.setSystemTime(5_000);
      listener(response('reminder-1', '/read/2:255'));
      expect(router.navigate).toHaveBeenCalledTimes(2);
    } finally {
      jest.useRealTimers();
    }
  });

  it('opens a cold-start tap once when the listener also delivers it', async () => {
    jest
      .mocked(Notifications.getLastNotificationResponseAsync)
      .mockResolvedValueOnce(response('reminder-cold-dup', '/salah'));

    registerReminderDeepLinks();
    const listener = tapListener();
    listener(response('reminder-cold-dup', '/salah'));
    await Promise.resolve();

    expect(router.navigate).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenCalledWith('/salah');
  });

  it('opens a tap made while the app is in the foreground through the response listener', () => {
    registerReminderDeepLinks();

    tapListener()(response('reminder-foreground', '/azkar/category/morning'));

    expect(router.navigate).toHaveBeenCalledWith('/azkar/category/morning');
    expect(Notifications.getLastNotificationResponseAsync).toHaveBeenCalledTimes(1);
  });

  it('opens the route from the cold-start response', async () => {
    jest
      .mocked(Notifications.getLastNotificationResponseAsync)
      .mockResolvedValueOnce(response('reminder-cold', '/read/1:1'));

    registerReminderDeepLinks();
    await Promise.resolve();

    expect(router.navigate).toHaveBeenCalledWith('/read/1:1');
  });
});
