import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';

import { registerReminderDeepLinks } from './reminder-deeplink';

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

  it('navigates to the reading position carried by the tapped reminder', () => {
    registerReminderDeepLinks();

    tapListener()(response('reminder-1', '/read/2:255'));

    expect(router.navigate).toHaveBeenCalledWith('/read/2:255');
  });

  it.each(['/settings', 'not-a-route', 42, undefined])('ignores the payload route %s', (route) => {
    registerReminderDeepLinks();

    tapListener()(response('reminder-1', route));

    expect(router.navigate).not.toHaveBeenCalled();
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

  it('opens the route from the cold-start response', async () => {
    jest
      .mocked(Notifications.getLastNotificationResponseAsync)
      .mockResolvedValueOnce(response('reminder-cold', '/read/1:1'));

    registerReminderDeepLinks();
    await Promise.resolve();

    expect(router.navigate).toHaveBeenCalledWith('/read/1:1');
  });
});
