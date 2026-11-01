import * as Notifications from 'expo-notifications';

import { installForegroundNotificationHandler } from './foreground';

type Handler = Parameters<typeof Notifications.setNotificationHandler>[0];

// The install flag is module state, so this file installs once in beforeAll and reads what that call registered.
let handler: NonNullable<Handler>;
let installedCount: number;

beforeAll(() => {
  installForegroundNotificationHandler();
  installForegroundNotificationHandler();
  installedCount = jest.mocked(Notifications.setNotificationHandler).mock.calls.length;
  handler = jest.mocked(Notifications.setNotificationHandler).mock.calls[0]?.[0] as NonNullable<Handler>;
});

describe('installForegroundNotificationHandler', () => {
  it('installs one handler when called repeatedly', () => {
    expect(installedCount).toBe(1);
  });

  it('shows the banner, the list and plays the sound, with no badge, for an incoming reminder', async () => {
    expect(handler).toBeDefined();

    const behavior = await handler.handleNotification({} as Notifications.Notification);

    expect(behavior).toEqual({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    });
  });

  it('returns a fresh object on each call, so a caller cannot change the shared flags', async () => {
    const first = await handler.handleNotification({} as Notifications.Notification);
    first.shouldShowBanner = false;
    const second = await handler.handleNotification({} as Notifications.Notification);

    expect(second.shouldShowBanner).toBe(true);
  });
});
