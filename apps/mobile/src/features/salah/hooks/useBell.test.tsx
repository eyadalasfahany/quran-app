import * as Notifications from 'expo-notifications';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { Alert, Linking } from 'react-native';

import { i18n } from '@/core/i18n';
import { storage, storageKeys } from '@/core/storage/mmkv';

import { useBell } from './index';

describe('useBell', () => {
  beforeEach(async () => {
    storage.clearAll();
    jest.clearAllMocks();
    await i18n.changeLanguage('ar');
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    jest.spyOn(Linking, 'openSettings').mockImplementation(() => Promise.resolve());
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
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('when permission is denied the toggle stays off and the guidance alert is shown', async () => {
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValueOnce({ granted: false } as never);
    jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValueOnce({ granted: false } as never);
    const { result } = await renderHook(() => useBell('asr'));

    await act(async () => {
      await expect(result.current.setEnabled(true)).resolves.toBe(false);
    });

    expect(result.current.enabled).toBe(false);
    expect(storage.getBoolean(storageKeys.salah.bellAsr)).toBeUndefined();
    expect(Alert.alert).toHaveBeenCalledTimes(1);
    expect(Alert.alert).toHaveBeenCalledWith(
      'لا يمكن إرسال التذكيرات',
      expect.any(String),
      expect.any(Array),
    );

    const buttons = jest.mocked(Alert.alert).mock.calls[0]?.[2] ?? [];
    buttons.find((button) => button.style !== 'cancel')?.onPress?.();
    expect(Linking.openSettings).toHaveBeenCalledTimes(1);
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
