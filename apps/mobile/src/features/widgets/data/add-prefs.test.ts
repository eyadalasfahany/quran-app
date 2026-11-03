import { storage, storageKeys } from '@/core/storage/mmkv';

import {
  effectiveAddDestination,
  markWidgetPinCompleted,
  readWidgetAddDestination,
  readWidgetPinCompleted,
  saveWidgetAddDestination,
} from './add-prefs';

describe('widget add prefs', () => {
  beforeEach(() => {
    storage.clearAll();
  });

  it('defaults destination to home', () => {
    expect(readWidgetAddDestination()).toBe('home');
  });

  it('persists destination', () => {
    saveWidgetAddDestination('lock');
    expect(readWidgetAddDestination()).toBe('lock');
    expect(storage.getString(storageKeys.widgets.addDestination)).toBe('lock');
  });

  it('maps lock when the catalog supports lock on any platform', () => {
    expect(effectiveAddDestination(['home', 'lock'], 'lock')).toBe('lock');
    expect(effectiveAddDestination(['home', 'lock'], 'home')).toBe('home');
    expect(effectiveAddDestination(['home'], 'lock')).toBe('home');
  });

  it('stores soft pin-completed flags per provider', () => {
    expect(readWidgetPinCompleted('NextPrayer')).toBe(false);
    markWidgetPinCompleted('NextPrayer');
    expect(readWidgetPinCompleted('NextPrayer')).toBe(true);
    expect(readWidgetPinCompleted('Misbaha')).toBe(false);
  });
});
