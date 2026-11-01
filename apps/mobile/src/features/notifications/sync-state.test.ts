import { storage } from '@/core/storage/mmkv';

import {
  coordsKey,
  currentSyncState,
  localDay,
  needsResync,
  readSyncState,
  writeSyncState,
  type ScheduleSyncState,
} from './sync-state';

const KEY = 'test.syncState';
const BASE: ScheduleSyncState = { day: '2026-10-31', timeZone: 'Europe/London', coordsKey: '51.51,-0.13' };

describe('schedule sync state', () => {
  beforeEach(() => {
    storage.clearAll();
  });

  it('keys coordinates to two decimals and marks no location as none', () => {
    expect(coordsKey(null)).toBe('none');
    expect(coordsKey({ lat: 51.50744, lng: -0.12781 })).toBe('51.51,-0.13');
  });

  it('gives the local calendar day, zero-padded', () => {
    expect(localDay(new Date(2026, 0, 5, 9, 0))).toBe('2026-01-05');
  });

  it('records the day, the time zone and the coordinates it was computed for', () => {
    const state = currentSyncState(new Date(2026, 9, 31, 12), { lat: 51.5074, lng: -0.1278 });

    expect(state.day).toBe('2026-10-31');
    expect(state.coordsKey).toBe('51.51,-0.13');
    expect(typeof state.timeZone).toBe('string');
  });

  it('needs a sync when nothing was synced yet', () => {
    expect(needsResync(null, BASE)).toBe(true);
  });

  it('needs no sync when the day, the time zone and the coordinates are unchanged', () => {
    expect(needsResync(BASE, { ...BASE })).toBe(false);
  });

  it.each([
    ['day', { day: '2026-11-01' }],
    ['time zone', { timeZone: 'Asia/Riyadh' }],
    ['coordinates', { coordsKey: 'none' }],
  ])('needs a sync when the %s changed', (_label, change) => {
    expect(needsResync(BASE, { ...BASE, ...change })).toBe(true);
  });

  it('round-trips the recorded state through MMKV under the given key', () => {
    writeSyncState(KEY, BASE);

    expect(readSyncState(KEY)).toEqual(BASE);
  });

  it('reads null when nothing is recorded, the value is unreadable, or it has the wrong shape', () => {
    expect(readSyncState(KEY)).toBeNull();

    storage.set(KEY, '{not json');
    expect(readSyncState(KEY)).toBeNull();

    storage.set(KEY, JSON.stringify({ day: 1 }));
    expect(readSyncState(KEY)).toBeNull();
  });
});
