import { readAppearance, saveAppearance } from '@/core/theme/appearance';
import { storage, storageKeys } from '@/core/storage/mmkv';

import { isAfterMaghrib, resolveWidgetColorMode, themeNameToWidgetColorMode } from './widget-color-mode';

describe('widget-color-mode', () => {
  beforeEach(() => {
    storage.clearAll();
  });

  it('maps sepia to light on widgets', () => {
    expect(themeNameToWidgetColorMode('sepia')).toBe('light');
    expect(themeNameToWidgetColorMode('dark')).toBe('dark');
  });

  it('respects forced dark appearance', () => {
    saveAppearance('dark');
    expect(resolveWidgetColorMode({ colorScheme: 'light', afterMaghrib: false })).toBe('dark');
  });

  it('uses dark after Maghrib when enabled', () => {
    storage.set(storageKeys.darkAfterMaghrib, true);
    saveAppearance('automatic');
    expect(
      resolveWidgetColorMode({ colorScheme: 'light', darkAfterMaghrib: true, afterMaghrib: true }),
    ).toBe('dark');
  });

  it('detects after Maghrib from prayer entries', () => {
    const day = new Date(2026, 10, 2, 18, 0).getTime();
    const maghribAt = new Date(2026, 10, 2, 16, 30).getTime();
    expect(
      isAfterMaghrib([{ at: maghribAt, key: 'maghrib' }], day),
    ).toBe(true);
    expect(
      isAfterMaghrib([{ at: maghribAt, key: 'maghrib' }], maghribAt - 1000),
    ).toBe(false);
  });

  it('reads appearance from MMKV when not passed', () => {
    saveAppearance('light');
    expect(readAppearance()).toBe('light');
    expect(resolveWidgetColorMode({ afterMaghrib: false })).toBe('light');
  });
});
