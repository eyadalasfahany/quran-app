import * as Location from 'expo-location';
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

/** Prayer notifications only: the renew reminder (ADR 0083) shares the `/salah` route and is counted apart. */
function prayerPending(): Pending[] {
  return pending.filter((request) => request.content.data?.kind !== 'renew');
}

function scheduledCount(): number {
  return jest.mocked(Notifications.scheduleNotificationAsync).mock.calls.filter(
    ([request]) => (request.content.data as Record<string, unknown> | undefined)?.kind !== 'renew',
  ).length;
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
    // The jest.setup default: location is denied until a test approves it.
    jest.mocked(Location.getForegroundPermissionsAsync).mockResolvedValue({ status: 'denied' } as never);
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
    expect(prayerPending()).toHaveLength(8);
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
    // Explicit offs: a chosen city arms the bells that were never set (ADR 0064), which would change this count.
    for (const key of [
      storageKeys.salah.bellDhuhr,
      storageKeys.salah.bellAsr,
      storageKeys.salah.bellMaghrib,
      storageKeys.salah.bellIsha,
    ]) {
      storage.set(key, false);
    }
    await renderHook(() => usePrayerNotificationsSync(true));
    await waitFor(() => expect(scheduledCount()).toBe(8));
    await settle();
    jest.mocked(Notifications.scheduleNotificationAsync).mockClear();
    jest.mocked(getCoordinates).mockResolvedValue(RIYADH);

    setManualLocation({ id: 'riyadh', lat: RIYADH.lat, lng: RIYADH.lng });
    await settle();

    expect(scheduledCount()).toBe(8);
    expect(prayerPending()).toHaveLength(8);
  });

  it('on launch with location approved, arms the five unset bells (ADR 0064)', async () => {
    jest.mocked(Location.getForegroundPermissionsAsync).mockResolvedValue({ status: 'granted' } as never);

    await renderHook(() => usePrayerNotificationsSync(true));
    await waitFor(() => expect(scheduledCount()).toBe(40));
    await settle();

    for (const key of [
      storageKeys.salah.bellFajr,
      storageKeys.salah.bellDhuhr,
      storageKeys.salah.bellAsr,
      storageKeys.salah.bellMaghrib,
      storageKeys.salah.bellIsha,
    ]) {
      expect(storage.getBoolean(key)).toBe(true);
    }
  });

  it('on launch with location denied, leaves the bells unset', async () => {
    await renderHook(() => usePrayerNotificationsSync(true));
    await settle();

    expect(storage.getBoolean(storageKeys.salah.bellFajr)).toBeUndefined();
    expect(storage.getBoolean(storageKeys.salah.bellIsha)).toBeUndefined();
    expect(scheduledCount()).toBe(0);
  });

  it('on foreground, arms the bells once location has been approved in Settings', async () => {
    await renderHook(() => usePrayerNotificationsSync(true));
    await settle();
    expect(storage.getBoolean(storageKeys.salah.bellFajr)).toBeUndefined();

    jest.mocked(Location.getForegroundPermissionsAsync).mockResolvedValue({ status: 'granted' } as never);
    foregroundListener()('active');
    await waitFor(() => expect(scheduledCount()).toBe(40));
    await settle();

    expect(storage.getBoolean(storageKeys.salah.bellFajr)).toBe(true);
    expect(storage.getBoolean(storageKeys.salah.bellIsha)).toBe(true);
  });

  it('with enabled false, does not arm the bells even when location is approved', async () => {
    jest.mocked(Location.getForegroundPermissionsAsync).mockResolvedValue({ status: 'granted' } as never);

    await renderHook(() => usePrayerNotificationsSync(false));
    await settle();

    expect(Location.getForegroundPermissionsAsync).not.toHaveBeenCalled();
    expect(storage.getBoolean(storageKeys.salah.bellFajr)).toBeUndefined();
    expect(scheduledCount()).toBe(0);
  });

  it('a chosen city with location denied arms the five unset bells through the real four-key write (ADR 0064)', async () => {
    await renderHook(() => usePrayerNotificationsSync(true));
    await settle();
    expect(storage.getBoolean(storageKeys.salah.bellFajr)).toBeUndefined();
    jest.mocked(getCoordinates).mockResolvedValue(RIYADH);

    setManualLocation({ id: 'riyadh', lat: RIYADH.lat, lng: RIYADH.lng });
    await waitFor(() => expect(prayerPending()).toHaveLength(40));
    await settle();

    for (const key of [
      storageKeys.salah.bellFajr,
      storageKeys.salah.bellDhuhr,
      storageKeys.salah.bellAsr,
      storageKeys.salah.bellMaghrib,
      storageKeys.salah.bellIsha,
    ]) {
      expect(storage.getBoolean(key)).toBe(true);
    }
  });

  it('a chosen city keeps an explicit off on one bell and turns on the other four', async () => {
    storage.set(storageKeys.salah.bellIsha, false);
    await renderHook(() => usePrayerNotificationsSync(true));
    await settle();
    jest.mocked(getCoordinates).mockResolvedValue(RIYADH);

    setManualLocation({ id: 'riyadh', lat: RIYADH.lat, lng: RIYADH.lng });
    await waitFor(() => expect(prayerPending()).toHaveLength(32));
    await settle();

    expect(storage.getBoolean(storageKeys.salah.bellIsha)).toBe(false);
    expect(storage.getBoolean(storageKeys.salah.bellFajr)).toBe(true);
    expect(storage.getBoolean(storageKeys.salah.bellMaghrib)).toBe(true);
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
