import { storage, storageKeys } from '@/core/storage/mmkv';

import { applyDirection, directionMatches, reloadApp } from './direction';
import { i18n } from './i18n';
import { getLocale, saveLocale, type Locale } from './locale';

// Not ready means a reload was requested and the caller keeps the splash up.
// `reload` resolves false only if that reload failed.
export type DirectionCheck = { ready: true } | { ready: false; reload: Promise<boolean> };

// The flag records that a reload was requested to fix the direction, so a
// direction that never applies costs one reload instead of an endless loop.
function reloadForDirection(locale: Locale): Promise<boolean> {
  storage.set(storageKeys.directionReloadPending, true);
  applyDirection(locale);
  return reloadApp();
}

export function setLocale(locale: Locale): void {
  saveLocale(locale);
  void i18n.changeLanguage(locale);
  if (directionMatches(locale)) {
    return;
  }
  // A failed reload is logged; the new direction then applies on the next launch.
  void reloadForDirection(locale);
}

export function ensureDirection(): DirectionCheck {
  const locale = getLocale();
  void i18n.changeLanguage(locale);
  const reloadPending = storage.contains(storageKeys.directionReloadPending);
  storage.remove(storageKeys.directionReloadPending);
  if (directionMatches(locale)) {
    return { ready: true };
  }
  if (reloadPending) {
    // Already reloaded once and the direction still disagrees: show the app rather than loop.
    console.warn(`Layout direction did not apply for locale "${locale}" after a reload.`);
    return { ready: true };
  }
  return { ready: false, reload: reloadForDirection(locale) };
}
