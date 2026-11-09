import * as Notifications from 'expo-notifications';
import { renderHook, waitFor } from '@testing-library/react-native';

import { storage, storageKeys } from '@/core/storage/mmkv';
import { getCoordinates } from '@/features/salah/data/location';

import { useHasReminderLocation, useNotificationsGranted } from './hooks';

jest.mock('@/features/salah/data/location', () => ({
  ...jest.requireActual<typeof import('@/features/salah/data/location')>('@/features/salah/data/location'),
  getCoordinates: jest.fn(),
}));

describe('useHasReminderLocation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getCoordinates).mockResolvedValue({ lat: 51.5, lng: -0.13 });
  });

  it('does not read the location while the reminder is not prayer-relative', async () => {
    const view = await renderHook((props: { active: boolean }) => useHasReminderLocation(props.active), {
      initialProps: { active: false },
    });

    expect(view.result.current).toBeNull();
    expect(getCoordinates).not.toHaveBeenCalled();
  });

  it('reports a known location for an active prayer-relative reminder', async () => {
    const view = await renderHook((props: { active: boolean }) => useHasReminderLocation(props.active), {
      initialProps: { active: true },
    });

    await waitFor(() => expect(view.result.current).toBe(true));
    expect(getCoordinates).toHaveBeenCalledTimes(1);
  });

  it('reports no location when none is set or the read fails', async () => {
    storage.remove(storageKeys.salah.lastAutoCoords);
    jest.mocked(getCoordinates).mockResolvedValueOnce(null);
    const first = await renderHook(() => useHasReminderLocation(true));
    await waitFor(() => expect(first.result.current).toBe(false));

    jest.mocked(getCoordinates).mockRejectedValueOnce(new Error('gps'));
    const second = await renderHook(() => useHasReminderLocation(true));
    await waitFor(() => expect(second.result.current).toBe(false));
  });
});

describe('useHasReminderLocation with the saved place', () => {
  it('counts the last known place when no fix is available (ADR 0086)', async () => {
    storage.set(storageKeys.salah.lastAutoCoords, '24.71,46.68');
    jest.mocked(getCoordinates).mockResolvedValueOnce(null);

    const view = await renderHook(() => useHasReminderLocation(true));

    await waitFor(() => expect(view.result.current).toBe(true));
  });
});

describe('useNotificationsGranted', () => {
  it('reads the system permission on mount', async () => {
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValueOnce({ granted: false } as never);

    const view = await renderHook(() => useNotificationsGranted());

    await waitFor(() => expect(view.result.current.granted).toBe(false));
  });
});
