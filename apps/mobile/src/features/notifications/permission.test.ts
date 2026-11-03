import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { ensureReminderPermission, needsExactAlarmAccess, requestExactAlarmAccess } from './permission';

describe('exact alarm access', () => {
  let platform: typeof Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    // Drop any queued once-value a test left unused (the iOS case never calls the system).
    jest.mocked(Notifications.getExactAlarmPermissionsAsync).mockReset().mockResolvedValue({ granted: true } as never);
    jest.mocked(Notifications.requestExactAlarmPermissionsAsync).mockReset().mockResolvedValue({ granted: true } as never);
    platform = Platform.OS;
  });

  afterEach(() => {
    jest.replaceProperty(Platform, 'OS', platform);
  });

  describe('needsExactAlarmAccess', () => {
    it('is false off Android, without asking the system', async () => {
      jest.replaceProperty(Platform, 'OS', 'ios');
      jest.mocked(Notifications.getExactAlarmPermissionsAsync).mockResolvedValueOnce({ granted: false } as never);

      await expect(needsExactAlarmAccess()).resolves.toBe(false);
      expect(Notifications.getExactAlarmPermissionsAsync).not.toHaveBeenCalled();
    });

    it('is true on Android when exact alarms are not granted', async () => {
      jest.replaceProperty(Platform, 'OS', 'android');
      jest.mocked(Notifications.getExactAlarmPermissionsAsync).mockResolvedValueOnce({ granted: false } as never);

      await expect(needsExactAlarmAccess()).resolves.toBe(true);
    });

    it('is false on Android when exact alarms are granted', async () => {
      jest.replaceProperty(Platform, 'OS', 'android');
      jest.mocked(Notifications.getExactAlarmPermissionsAsync).mockResolvedValueOnce({ granted: true } as never);

      await expect(needsExactAlarmAccess()).resolves.toBe(false);
    });

    it('catches a failed read and reports nothing needed', async () => {
      jest.replaceProperty(Platform, 'OS', 'android');
      jest.mocked(Notifications.getExactAlarmPermissionsAsync).mockRejectedValueOnce(new Error('native module missing'));

      await expect(needsExactAlarmAccess()).resolves.toBe(false);
    });
  });

  describe('requestExactAlarmAccess', () => {
    it('resolves to true when the system grants exact alarms', async () => {
      jest.mocked(Notifications.requestExactAlarmPermissionsAsync).mockResolvedValueOnce({ granted: true } as never);

      await expect(requestExactAlarmAccess()).resolves.toBe(true);
    });

    it('resolves to false when the user keeps exact alarms denied', async () => {
      jest.mocked(Notifications.requestExactAlarmPermissionsAsync).mockResolvedValueOnce({ granted: false } as never);

      await expect(requestExactAlarmAccess()).resolves.toBe(false);
    });

    it('resolves to false instead of rejecting when the request fails', async () => {
      jest.mocked(Notifications.requestExactAlarmPermissionsAsync).mockRejectedValueOnce(new Error('not declared'));

      await expect(requestExactAlarmAccess()).resolves.toBe(false);
    });
  });
});

describe('ensureReminderPermission', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns true without prompting when already granted', async () => {
    await expect(ensureReminderPermission()).resolves.toBe(true);
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });
});
