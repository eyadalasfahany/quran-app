import * as Notifications from 'expo-notifications';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { i18n } from '@/core/i18n';
import { storage, storageKeys } from '@/core/storage/mmkv';
import * as notificationsData from '../data/notifications';

import { useBell } from './index';

describe('useBell', () => {
  beforeEach(async () => {
    storage.clearAll();
    jest.clearAllMocks();
    await i18n.changeLanguage('ar');
  });

  it('starts off, with nothing pre-enabled', async () => {
    const { result } = await renderHook(() => useBell('fajr'));

    expect(result.current.enabled).toBe(false);
  });

  it('reads a persisted bell on mount, so it survives a restart', async () => {
    storage.set(storageKeys.salah.bellMaghrib, true);

    const { result } = await renderHook(() => useBell('maghrib'));

    expect(result.current.enabled).toBe(true);
  });

  it('turning on with permission persists the bell and updates the switch', async () => {
    const { result } = await renderHook(() => useBell('dhuhr'));

    await act(async () => {
      await expect(result.current.setEnabled(true)).resolves.toBe(true);
    });

    expect(storage.getBoolean(storageKeys.salah.bellDhuhr)).toBe(true);
    expect(result.current.enabled).toBe(true);
    expect(result.current.permissionDenied).toBe(false);
  });

  it('when permission is denied the toggle stays off and the caller is told to show the dialog', async () => {
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValueOnce({ granted: false } as never);
    jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValueOnce({ granted: false } as never);
    const { result } = await renderHook(() => useBell('asr'));

    await act(async () => {
      await expect(result.current.setEnabled(true)).resolves.toBe(false);
    });

    expect(result.current.enabled).toBe(false);
    expect(storage.getBoolean(storageKeys.salah.bellAsr)).toBeUndefined();
    expect(result.current.permissionDenied).toBe(true);
  });

  it('dismissing the dialog clears the denial without touching the bell', async () => {
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValueOnce({ granted: false } as never);
    jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValueOnce({ granted: false } as never);
    const { result } = await renderHook(() => useBell('isha'));

    await act(async () => {
      await result.current.setEnabled(true);
    });
    expect(result.current.permissionDenied).toBe(true);

    await act(async () => {
      result.current.dismissPermissionDenied();
    });

    expect(result.current.permissionDenied).toBe(false);
    expect(result.current.enabled).toBe(false);
  });

  it('toggle flips the stored bell both ways', async () => {
    const { result } = await renderHook(() => useBell('isha'));

    result.current.toggle();
    await waitFor(() => expect(result.current.enabled).toBe(true));

    result.current.toggle();
    await waitFor(() => expect(result.current.enabled).toBe(false));
    expect(storage.getBoolean(storageKeys.salah.bellIsha)).toBe(false);
  });

  it('follows a change made elsewhere (the Settings switch) without remounting', async () => {
    const { result } = await renderHook(() => useBell('fajr'));
    expect(result.current.enabled).toBe(false);

    await act(async () => {
      storage.set(storageKeys.salah.bellFajr, true);
    });

    await waitFor(() => expect(result.current.enabled).toBe(true));
  });
});

describe('useBell exact alarms', () => {
  let platform: typeof Platform.OS;

  beforeEach(async () => {
    storage.clearAll();
    jest.clearAllMocks();
    platform = Platform.OS;
    await i18n.changeLanguage('ar');
  });

  afterEach(() => {
    jest.replaceProperty(Platform, 'OS', platform);
    jest.restoreAllMocks();
  });

  // The exact-alarm check is not awaited by setEnabled, so flush it inside act to keep its state update in scope.
  const turnOn = (setEnabled: (on: boolean) => Promise<boolean>) =>
    act(async () => {
      await setEnabled(true);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

  const denyExactAlarm = () =>
    jest.mocked(Notifications.getExactAlarmPermissionsAsync).mockResolvedValue({ granted: false } as never);

  it('asks for exact-alarm access on Android when a turn-on is applied and exact alarms are denied', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    denyExactAlarm();
    const { result } = await renderHook(() => useBell('fajr'));

    await act(async () => {
      await expect(result.current.setEnabled(true)).resolves.toBe(true);
    });

    await waitFor(() => expect(result.current.exactAlarmNeeded).toBe(true));
    expect(result.current.enabled).toBe(true);
  });

  it('does not ask on iOS, where exact alarms do not apply', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    denyExactAlarm();
    const { result } = await renderHook(() => useBell('fajr'));

    await turnOn(result.current.setEnabled);

    expect(Notifications.getExactAlarmPermissionsAsync).not.toHaveBeenCalled();
    expect(result.current.exactAlarmNeeded).toBe(false);
  });

  it('does not ask on Android when exact alarms are already granted', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    jest.mocked(Notifications.getExactAlarmPermissionsAsync).mockResolvedValue({ granted: true } as never);
    const { result } = await renderHook(() => useBell('dhuhr'));

    await turnOn(result.current.setEnabled);

    await waitFor(() => expect(Notifications.getExactAlarmPermissionsAsync).toHaveBeenCalled());
    expect(result.current.exactAlarmNeeded).toBe(false);
  });

  it('does not check exact alarms when the bell is refused or turned off', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValueOnce({ granted: false } as never);
    jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValueOnce({ granted: false } as never);
    const { result } = await renderHook(() => useBell('asr'));

    await turnOn(result.current.setEnabled);

    expect(Notifications.getExactAlarmPermissionsAsync).not.toHaveBeenCalled();
    expect(result.current.exactAlarmNeeded).toBe(false);
  });

  it('keeps the bell on while the exact-alarm prompt is open', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    denyExactAlarm();
    const { result } = await renderHook(() => useBell('maghrib'));

    await turnOn(result.current.setEnabled);

    await waitFor(() => expect(result.current.exactAlarmNeeded).toBe(true));
    expect(storage.getBoolean(storageKeys.salah.bellMaghrib)).toBe(true);
    expect(result.current.enabled).toBe(true);
  });

  it('dismissing the exact-alarm prompt hides it without touching the bell', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    denyExactAlarm();
    const { result } = await renderHook(() => useBell('isha'));
    await turnOn(result.current.setEnabled);
    await waitFor(() => expect(result.current.exactAlarmNeeded).toBe(true));

    await act(async () => {
      result.current.dismissExactAlarm();
    });

    expect(result.current.exactAlarmNeeded).toBe(false);
    expect(result.current.enabled).toBe(true);
  });

  it('granting exact alarms hides the prompt and re-plans the prayer notifications', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    denyExactAlarm();
    jest.mocked(Notifications.requestExactAlarmPermissionsAsync).mockResolvedValueOnce({ granted: true } as never);
    const resync = jest.spyOn(notificationsData, 'resyncPrayerNotifications').mockResolvedValue(undefined);
    const { result } = await renderHook(() => useBell('fajr'));
    await turnOn(result.current.setEnabled);
    await waitFor(() => expect(result.current.exactAlarmNeeded).toBe(true));
    resync.mockClear();

    await act(async () => {
      await result.current.grantExactAlarm();
    });

    expect(Notifications.requestExactAlarmPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(resync).toHaveBeenCalledTimes(1);
    expect(result.current.exactAlarmNeeded).toBe(false);
    expect(result.current.enabled).toBe(true);
  });

  it('declining exact alarms hides the prompt, does not re-plan, and leaves the bell on', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    denyExactAlarm();
    jest.mocked(Notifications.requestExactAlarmPermissionsAsync).mockResolvedValueOnce({ granted: false } as never);
    const resync = jest.spyOn(notificationsData, 'resyncPrayerNotifications').mockResolvedValue(undefined);
    const { result } = await renderHook(() => useBell('asr'));
    await turnOn(result.current.setEnabled);
    await waitFor(() => expect(result.current.exactAlarmNeeded).toBe(true));
    resync.mockClear();

    await act(async () => {
      await result.current.grantExactAlarm();
    });

    expect(resync).not.toHaveBeenCalled();
    expect(result.current.exactAlarmNeeded).toBe(false);
    expect(result.current.enabled).toBe(true);
  });
});
