import * as Location from 'expo-location';

import { storage, storageKeys } from '@/core/storage/mmkv';

import { getCityById } from './cities';
import { getCoordinates, getLocationPermissionStatus, getStoredLocationSource, getStoredManualCityId, type LocationSource } from './location';

/**
 * How long one location read serves every screen that asks for it. Home, Menu, Salah and Qibla all mount the same
 * location hook; without this each mount re-checked permission and re-read the GPS.
 */
export const LOCATION_CACHE_TTL_MS = 60 * 1000;

export type PrayerLocationSnapshot = {
  source: LocationSource;
  coords: { lat: number; lng: number } | null;
  cityId?: string;
  cityName?: { ar: string; en: string };
  permissionStatus: Location.PermissionStatus;
};

type Entry = { key: string; readAt: number; value: PrayerLocationSnapshot };

let entry: Entry | null = null;
let inFlight: { key: string; promise: Promise<PrayerLocationSnapshot> } | null = null;
// Bumped by invalidation, so a read that started before it does not write its stale result back.
let generation = 0;

/** The stored choice the snapshot was read for. A change to any part of it makes the snapshot stale at once. */
function currentKey(): string {
  return JSON.stringify([
    getStoredLocationSource(),
    getStoredManualCityId() ?? null,
    storage.getNumber(storageKeys.salah.manualLat) ?? null,
    storage.getNumber(storageKeys.salah.manualLng) ?? null,
  ]);
}

/** The cached snapshot, if it is for the current choice and younger than the TTL. Synchronous, so it can seed a first render. */
export function peekPrayerLocation(now: number = Date.now()): PrayerLocationSnapshot | null {
  if (entry === null || entry.key !== currentKey() || now - entry.readAt >= LOCATION_CACHE_TTL_MS) {
    return null;
  }
  return entry.value;
}

async function readPrayerLocation(): Promise<PrayerLocationSnapshot> {
  const source = getStoredLocationSource();
  const manualCityId = getStoredManualCityId();
  const permissionStatus = await getLocationPermissionStatus();
  const coords = await getCoordinates();

  let cityName: { ar: string; en: string } | undefined;
  if (source === 'manual' && manualCityId) {
    const city = getCityById(manualCityId);
    if (city) {
      cityName = { ar: city.ar, en: city.en };
    }
  }
  return { source, coords, cityId: manualCityId, cityName, permissionStatus };
}

/**
 * The location for the prayer screens: the cached snapshot when it is fresh, otherwise one read. Concurrent callers for
 * the same choice share that read.
 */
export function loadPrayerLocation(): Promise<PrayerLocationSnapshot> {
  const key = currentKey();
  const fresh = peekPrayerLocation();
  if (fresh !== null) {
    return Promise.resolve(fresh);
  }
  if (inFlight !== null && inFlight.key === key) {
    return inFlight.promise;
  }

  const token = generation;
  const promise: Promise<PrayerLocationSnapshot> = readPrayerLocation().then((value) => {
    if (token === generation) {
      entry = { key, readAt: Date.now(), value };
    }
    return value;
  });
  const tracked = promise.finally(() => {
    if (inFlight?.promise === tracked) {
      inFlight = null;
    }
  });
  inFlight = { key, promise: tracked };
  return tracked;
}

/** Drops the cached snapshot and any read in flight: the next load reads fresh. Used after a permission or city change. */
export function invalidatePrayerLocation(): void {
  generation += 1;
  entry = null;
  inFlight = null;
}
