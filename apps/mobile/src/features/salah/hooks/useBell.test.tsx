import * as Notifications from 'expo-notifications';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { i18n } from '@/core/i18n';
import { storage, storageKeys } from '@/core/storage/mmkv';

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
