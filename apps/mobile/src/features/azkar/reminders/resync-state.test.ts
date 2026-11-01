import { storage, storageKeys } from '@/core/storage/mmkv';

import {
  coordsKey,
  currentSyncState,
  localDay,
  needsAzkarResync,
  readRemindersSyncState,
  writeRemindersSyncState,
  type RemindersSyncState,
} from './resync-state';

const BASE: RemindersSyncState = { day: '2026-10-31', timeZone: 'Europe/London', coordsKey: '51.51,-0.13' };

describe('needsAzkarResync', () => {
  it('needs a sync when nothing was synced yet', () => {
    expect(needsAzkarResync(null, BASE)).toBe(true);
  });

  it('needs no sync when the day, the time zone and the coordinates are unchanged', () => {
    expect(needsAzkarResync(BASE, { ...BASE })).toBe(false);
  });

  it('needs a sync when the date changed', () => {
    expect(needsAzkarResync(BASE, { ...BASE, day: '2026-11-01' })).toBe(true);
  });

  it('needs a sync when the time zone changed', () => {
    expect(needsAzkarResync(BASE, { ...BASE, timeZone: 'Asia/Riyadh' })).toBe(true);
  });

  it('needs a sync when the coordinates changed, from a manual city to GPS or the other way', () => {
    expect(needsAzkarResync(BASE, { ...BASE, coordsKey: '21.42,39.83' })).toBe(true);
    expect(needsAzkarResync(BASE, { ...BASE, coordsKey: 'none' })).toBe(true);
  });
});

describe('coordsKey and localDay', () => {
  it('rounds coordinates to two decimals so a jittering GPS fix does not resync', () => {
    expect(coordsKey({ lat: 51.5074, lng: -0.1278 })).toBe('51.51,-0.13');
    expect(coordsKey({ lat: 51.5071, lng: -0.1281 })).toBe('51.51,-0.13');
    expect(coordsKey(null)).toBe('none');
  });

  it('names the local calendar day', () => {
    expect(localDay(new Date(2026, 9, 5, 9, 0))).toBe('2026-10-05');
  });

  it('reads the time zone from the device', () => {
    const state = currentSyncState(new Date(2026, 9, 31), null);

    expect(state.timeZone).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
    expect(state.coordsKey).toBe('none');
  });
});

describe('the stored sync record', () => {
  beforeEach(() => {
    storage.clearAll();
  });

  it('is null until a sync is recorded', () => {
    expect(readRemindersSyncState()).toBeNull();
  });

  it('round-trips through MMKV under the Azkar key', () => {
    writeRemindersSyncState(BASE);

    expect(storage.getString(storageKeys.azkar.remindersSync)).toBe(JSON.stringify(BASE));
    expect(readRemindersSyncState()).toEqual(BASE);
  });

  it('treats an unreadable record as never synced', () => {
    storage.set(storageKeys.azkar.remindersSync, '{not json');
    expect(readRemindersSyncState()).toBeNull();

    storage.set(storageKeys.azkar.remindersSync, JSON.stringify({ day: 1 }));
    expect(readRemindersSyncState()).toBeNull();
  });
});
