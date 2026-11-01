import * as Notifications from 'expo-notifications';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AppState } from 'react-native';

import { storage, storageKeys } from '@/core/storage/mmkv';
import { writeSyncState, currentSyncState } from '@/features/notifications/sync-state';

import { getCoordinates, setManualLocation } from '../data/location';
import { usePrayerNotificationsSync } from './usePrayerNotificationsSync';

jest.mock('../data/location', () => ({
  ...jest.requireActual<typeof import('../data/location')>('../data/location'),
  getCoordinates: jest.fn(),
}));

const LONDON = { lat: 51.5074, lng: -0.1278 };
const RIYADH = { lat: 24.7136, lng: 46.6753 };

type Pending = { identifier: string; content: { data?: Record<string, unknown> } };
let pending: Pending[] = [];
let sequence = 0;

function scheduledCount(): number {
  return jest.mocked(Notifications.scheduleNotificationAsync).mock.calls.length;
}

/** Waits for the queued sync to settle: a short real delay lets the chained promises run. */
async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
}

function foregroundListener(): (state: string) => void {
  const call = jest.mocked(AppState.addEventListener).mock.calls.find(([type]) => type === 'change');
  expect(call).toBeDefined();
  return call?.[1] as (state: string) => void;
}

describe('usePrayerNotificationsSync', () => {
  beforeEach(() => {
    storage.clearAll();
    jest.clearAllMocks();
    pending = [];
    sequence = 0;
    jest.mocked(getCoordinates).mockResolvedValue(LONDON);
    jest.mocked(Notifications.scheduleNotificationAsync).mockImplementation((request) => {
      sequence += 1;
      const identifier = `prayer-${sequence}`;
      pending.push({ identifier, content: request.content as Pending['content'] });
      return Promise.resolve(identifier);
    });
    jest.mocked(Notifications.cancelScheduledNotificationAsync).mockImplementation((identifier) => {
      pending = pending.filter((request) => request.identifier !== identifier);
      return Promise.resolve();
    });
    jest.mocked(Notifications.getAllScheduledNotificationsAsync).mockImplementation(() =>
      Promise.resolve(pending as never),
    );
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.spyOn(AppState, 'addEventListener').mockImplementation(() => ({ remove: jest.fn() }) as never);
  });

  it('does nothing while not enabled (before the app is ready)', async () => {
    storage.set(storageKeys.salah.bellFajr, true);

    await renderHook(() => usePrayerNotificationsSync(false));
    await settle();

    expect(scheduledCount()).toBe(0);
    expect(AppState.addEventListener).not.toHaveBeenCalled();
  });

  it('re-plans once on launch', async () => {
    storage.set(storageKeys.salah.bellFajr, true);

    await renderHook(() => usePrayerNotificationsSync(true));
    await waitFor(() => expect(scheduledCount()).toBe(8));
    await settle();

    expect(scheduledCount()).toBe(8);
  });

  it('on foreground with nothing moved, does not re-plan', async () => {
    storage.set(storageKeys.salah.bellFajr, true);
    await renderHook(() => usePrayerNotificationsSync(true));
    await waitFor(() => expect(scheduledCount()).toBe(8));
    jest.mocked(Notifications.scheduleNotificationAsync).mockClear();

    foregroundListener()('active');
    await settle();

    expect(scheduledCount()).toBe(0);
  });

  it('on foreground when the day changed, re-plans exactly once', async () => {
    storage.set(storageKeys.salah.bellFajr, true);
    await renderHook(() => usePrayerNotificationsSync(true));
    await waitFor(() => expect(scheduledCount()).toBe(8));
    writeSyncState(storageKeys.salah.notificationsSync, { ...currentSyncState(new Date(), LONDON), day: '2000-01-01' });
    jest.mocked(Notifications.scheduleNotificationAsync).mockClear();

    foregroundListener()('active');
    await waitFor(() => expect(scheduledCount()).toBe(8));
    await settle();

    expect(scheduledCount()).toBe(8);
    expect(pending).toHaveLength(8);
  });

  it('ignores a background transition', async () => {
    storage.set(storageKeys.salah.bellFajr, true);
    await renderHook(() => usePrayerNotificationsSync(true));
    await waitFor(() => expect(scheduledCount()).toBe(8));
    writeSyncState(storageKeys.salah.notificationsSync, { ...currentSyncState(new Date(), LONDON), day: '2000-01-01' });
    jest.mocked(Notifications.scheduleNotificationAsync).mockClear();

    foregroundListener()('background');
    await settle();

    expect(scheduledCount()).toBe(0);
  });

  it('a manual city (four keys written in a row) re-plans once, not four times', async () => {
    storage.set(storageKeys.salah.bellFajr, true);
    await renderHook(() => usePrayerNotificationsSync(true));
    await waitFor(() => expect(scheduledCount()).toBe(8));
    await settle();
    jest.mocked(Notifications.scheduleNotificationAsync).mockClear();
    jest.mocked(getCoordinates).mockResolvedValue(RIYADH);

    setManualLocation({ id: 'riyadh', lat: RIYADH.lat, lng: RIYADH.lng });
    await settle();

    expect(scheduledCount()).toBe(8);
    expect(pending).toHaveLength(8);
  });

  it('removes its listeners on unmount', async () => {
    const remove = jest.fn();
    jest.mocked(AppState.addEventListener).mockImplementationOnce(() => ({ remove }) as never);

    const { unmount } = await renderHook(() => usePrayerNotificationsSync(true));
    await act(async () => {
      unmount();
    });

    expect(remove).toHaveBeenCalledTimes(1);
  });
});
