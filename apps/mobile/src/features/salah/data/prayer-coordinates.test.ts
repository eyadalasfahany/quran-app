import { storage, storageKeys } from '@/core/storage/mmkv';
import { writeSyncState } from '@/features/notifications/sync-state';

import { getCoordinates, setAutoLocation, setManualLocation } from './location';
import { resolvePrayerCoordinates, savedPrayerCoordinates } from './prayer-coordinates';

jest.mock('./location', () => ({
  ...jest.requireActual<typeof import('./location')>('./location'),
  getCoordinates: jest.fn(),
}));

const RIYADH = { lat: 24.7136, lng: 46.6753 };
const SAVED = '24.71,46.68';

describe('resolvePrayerCoordinates (ADR 0086)', () => {
  beforeEach(() => {
    storage.clearAll();
    jest.clearAllMocks();
    setAutoLocation();
  });

  it('saves a fresh automatic fix at two decimals and returns it as not stale', async () => {
    jest.mocked(getCoordinates).mockResolvedValueOnce(RIYADH);

    await expect(resolvePrayerCoordinates()).resolves.toEqual({ coords: RIYADH, stale: false });
    expect(storage.getString(storageKeys.salah.lastAutoCoords)).toBe('24.71,46.68');
  });

  it('never saves a manual city', async () => {
    setManualLocation({ id: 'makkah', lat: 21.4225, lng: 39.8262 });
    jest.mocked(getCoordinates).mockResolvedValueOnce({ lat: 21.4225, lng: 39.8262 });

    await resolvePrayerCoordinates();

    expect(storage.getString(storageKeys.salah.lastAutoCoords)).toBeUndefined();
  });

  it('with no fix, uses the saved automatic place and marks it stale', async () => {
    storage.set(storageKeys.salah.lastAutoCoords, SAVED);
    jest.mocked(getCoordinates).mockResolvedValueOnce(null);

    await expect(resolvePrayerCoordinates()).resolves.toEqual({ coords: { lat: 24.71, lng: 46.68 }, stale: true });
  });

  it('with no fix and nothing saved, falls back to the last prayer sync coordinates', async () => {
    writeSyncState(storageKeys.salah.notificationsSync, { day: '2026-11-09', timeZone: 'UTC', coordsKey: '21.42,39.83' });
    jest.mocked(getCoordinates).mockResolvedValueOnce(null);

    await expect(resolvePrayerCoordinates()).resolves.toEqual({ coords: { lat: 21.42, lng: 39.83 }, stale: true });
  });

  it('with nothing anywhere, returns null and not stale', async () => {
    jest.mocked(getCoordinates).mockResolvedValueOnce(null);

    await expect(resolvePrayerCoordinates()).resolves.toEqual({ coords: null, stale: false });
  });

  it('savedPrayerCoordinates prefers the saved place over the last sync, and never reads a fix', () => {
    writeSyncState(storageKeys.salah.notificationsSync, { day: '2026-11-09', timeZone: 'UTC', coordsKey: '21.42,39.83' });
    storage.set(storageKeys.salah.lastAutoCoords, SAVED);

    expect(savedPrayerCoordinates()).toEqual({ lat: 24.71, lng: 46.68 });
    expect(getCoordinates).not.toHaveBeenCalled();

    storage.remove(storageKeys.salah.lastAutoCoords);
    expect(savedPrayerCoordinates()).toEqual({ lat: 21.42, lng: 39.83 });
  });
});
